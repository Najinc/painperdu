# Guide de Migration Frontend - MongoDB vers MySQL

Ce guide explique les modifications nécessaires pour adapter le frontend React à la nouvelle API MySQL.

## 🔄 Changements principaux

### 1. Structure des réponses API

#### Avant (MongoDB)
```javascript
// Réponse avec _id
{
  _id: "507f1f77bcf86cd799439011",
  name: "Pain Perdu Nature",
  category: { _id: "...", name: "..." }
}
```

#### Après (MySQL)
```javascript
// Réponse avec id (UUID)
{
  id: "123e4567-e89b-12d3-a456-426614174000",
  name: "Pain Perdu Nature",
  category: { id: "...", name: "..." }
}
```

### 2. Pagination et filtres

#### Avant
```javascript
// Requête simple
const response = await api.get('/products');
const products = response.data;
```

#### Après
```javascript
// Réponse avec pagination
const response = await api.get('/products?page=1&limit=20');
const { products, pagination } = response.data;
```

### 3. Gestion des erreurs

#### Avant
```javascript
// Erreur MongoDB
{
  message: "Validation failed",
  errors: { name: { message: "..." } }
}
```

#### Après
```javascript
// Erreur avec express-validator
{
  message: "Données invalides",
  errors: [
    { path: "name", msg: "Le nom est requis" }
  ]
}
```

## 📁 Fichiers à modifier

### 1. Configuration API (src/api/config.js)

```javascript
// Nouveau fichier ou modification
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### 2. Hooks personnalisés

#### useCategories.js
```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/config';

export const useCategories = () => {
  return useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await api.get('/categories');
      return response.data; // Plus besoin de .categories
    }
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (categoryData) => {
      const response = await api.post('/categories', categoryData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['categories']);
    }
  });
};
```

#### useProducts.js
```javascript
export const useProducts = (filters = {}) => {
  return useQuery({
    queryKey: ['products', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.categoryId) params.append('categoryId', filters.categoryId);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      
      const response = await api.get(`/products?${params}`);
      return response.data; // { products: [...], pagination: {...} }
    }
  });
};
```

#### useInventory.js
```javascript
export const useInventories = (filters = {}) => {
  return useQuery({
    queryKey: ['inventories', filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      if (filters.userId) params.append('userId', filters.userId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', filters.page);
      
      const response = await api.get(`/inventory?${params}`);
      return response.data;
    }
  });
};

export const useCreateInventory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (inventoryData) => {
      const response = await api.post('/inventory', inventoryData);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventories']);
    }
  });
};
```

### 3. Composants de pagination

```javascript
// components/Pagination.jsx
const Pagination = ({ pagination, onPageChange }) => {
  const { currentPage, totalPages, totalItems, itemsPerPage } = pagination;
  
  return (
    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Précédent
        </button>
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Suivant
        </button>
      </div>
      
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Affichage de{' '}
            <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span>{' '}
            à{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, totalItems)}
            </span>{' '}
            sur{' '}
            <span className="font-medium">{totalItems}</span> résultats
          </p>
        </div>
        
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm">
            {/* Boutons de pagination */}
          </nav>
        </div>
      </div>
    </div>
  );
};
```

### 4. Adaptation des formulaires

#### Gestion des erreurs
```javascript
// hooks/useFormError.js
export const useFormError = () => {
  const [errors, setErrors] = useState({});
  
  const setErrorsFromResponse = (errorResponse) => {
    if (errorResponse.errors && Array.isArray(errorResponse.errors)) {
      // Format MySQL/express-validator
      const newErrors = {};
      errorResponse.errors.forEach(error => {
        newErrors[error.path] = error.msg;
      });
      setErrors(newErrors);
    } else if (errorResponse.message) {
      // Erreur générale
      setErrors({ general: errorResponse.message });
    }
  };
  
  return { errors, setErrors, setErrorsFromResponse };
};
```

### 5. Adaptation des composants existants

#### Products.jsx
```javascript
const Products = () => {
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  
  const { data, isLoading, error } = useProducts({ 
    ...filters, 
    page, 
    limit: 20 
  });
  
  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;
  
  const { products, pagination } = data;
  
  return (
    <div>
      {/* Filtres */}
      <ProductFilters onFiltersChange={setFilters} />
      
      {/* Liste des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map(product => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
      
      {/* Pagination */}
      <Pagination 
        pagination={pagination} 
        onPageChange={setPage} 
      />
    </div>
  );
};
```

#### Statistics.jsx
```javascript
const Statistics = () => {
  const { data: overview } = useQuery({
    queryKey: ['statistics', 'overview'],
    queryFn: async () => {
      const response = await api.get('/statistics/overview');
      return response.data;
    }
  });
  
  const { data: periodStats } = useQuery({
    queryKey: ['statistics', 'period', startDate, endDate],
    queryFn: async () => {
      const response = await api.get('/statistics/period', {
        params: { startDate, endDate }
      });
      return response.data;
    },
    enabled: !!(startDate && endDate)
  });
  
  // Affichage des statistiques avec nouvelle structure
  return (
    <div>
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <StatCard 
            title="Ventes totales" 
            value={overview.totalSales || 0}
            format="currency"
          />
          <StatCard 
            title="Produits vendus" 
            value={overview.totalProductsSold || 0}
          />
          {/* ... autres statistiques */}
        </div>
      )}
    </div>
  );
};
```

## 🛠️ Modifications spécifiques

### 1. AuthContext
```javascript
// Mise à jour de la structure des réponses
const login = async (credentials) => {
  try {
    const response = await api.post('/auth/login', credentials);
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    setUser(user);
    setIsAuthenticated(true);
    
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      message: error.response?.data?.message || 'Erreur de connexion' 
    };
  }
};
```

### 2. Variables d'environnement

Créez/modifiez `.env` dans le frontend :
```env
REACT_APP_API_URL=http://localhost:3001/api
```

Pour la production :
```env
REACT_APP_API_URL=https://votre-domaine.com/api
```

## ✅ Checklist de migration

- [ ] Mettre à jour la configuration API (baseURL)
- [ ] Adapter tous les hooks de données
- [ ] Modifier la gestion des erreurs
- [ ] Ajouter la pagination aux composants liste
- [ ] Mettre à jour les formulaires
- [ ] Tester l'authentification
- [ ] Vérifier les statistiques
- [ ] Adapter les composants d'inventaire
- [ ] Mettre à jour les horaires
- [ ] Tester en mode production

## 🚀 Test de la migration

1. **Démarrage du backend MySQL**
   ```bash
   cd backend-mysql
   npm run init-db
   npm run create-admin
   npm start
   ```

2. **Test des endpoints**
   ```bash
   # Test de connexion
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@painperdu.com","password":"admin123"}'
   
   # Test des catégories
   curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/categories
   ```

3. **Démarrage du frontend**
   ```bash
   cd frontend
   npm run dev
   ```

4. **Tests fonctionnels**
   - Connexion/déconnexion
   - Navigation entre les pages
   - CRUD sur chaque entité
   - Affichage des statistiques
   - Gestion des erreurs