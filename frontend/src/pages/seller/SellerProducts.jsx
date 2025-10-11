import React, { useState, useMemo } from 'react'
import { useQuery } from 'react-query'
import axios from 'axios'
import { Search, Package, Euro, Tag } from 'lucide-react'

const SellerProducts = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  // Récupérer les produits
  const { data: productsResponse, isLoading: loadingProducts } = useQuery({
    queryKey: ['products'],
    queryFn: () => axios.get('/api/products?isActive=true').then(res => res.data)
  })

  const products = productsResponse?.products || []

  // Récupérer les catégories
  const { data: categoriesResponse } = useQuery({
    queryKey: ['categories'],
    queryFn: () => axios.get('/api/categories?isActive=true').then(res => res.data)
  })

  const categories = categoriesResponse?.categories || []

  // Filtrer les produits
  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = (product.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.description || '').toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = !selectedCategory || product.category.id === selectedCategory

      return matchesSearch && matchesCategory
    })
  }, [products, searchTerm, selectedCategory])

  const formatPrice = (price) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  if (loadingProducts) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Catalogue des Produits</h1>
        <p className="text-base-content/60">Consultez les produits disponibles</p>
      </div>

      {/* Barre de recherche et filtres */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Recherche */}
            <div className="form-control flex-1">
              <div className="input-group">
                <span>
                  <Search className="w-5 h-5" />
                </span>
                <input
                  type="text"
                  placeholder="Rechercher un produit..."
                  className="input input-bordered flex-1"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Filtre par catégorie */}
            <div className="form-control">
              <select
                className="select select-bordered"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">Toutes les catégories</option>
                {categories?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Statistiques */}
          <div className="stats stats-horizontal mt-4">
            <div className="stat">
              <div className="stat-title">Total Produits</div>
              <div className="stat-value text-primary">{products.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Affichés</div>
              <div className="stat-value text-secondary">{filteredProducts.length}</div>
            </div>
            <div className="stat">
              <div className="stat-title">Prix Moyen</div>
              <div className="stat-value text-accent">
                {products.length > 0 ? formatPrice(products.reduce((acc, p) => acc + p.price, 0) / products.length) : '0 €'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grille des produits */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Package className="w-16 h-16 mx-auto text-base-content/30 mb-4" />
            <p className="text-base-content/70">
              {searchTerm || selectedCategory 
                ? 'Aucun produit ne correspond aux critères de recherche'
                : 'Aucun produit disponible'
              }
            </p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.id} className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow">
              <div className="card-body">
                <h2 className="card-title text-lg">{product.name}</h2>
                
                {/* Catégorie */}
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-base-content/60" />
                  <span 
                    className="badge badge-outline" 
                    style={{ 
                      borderColor: product.category.color,
                      color: product.category.color
                    }}
                  >
                    {product.category?.name || 'Non définie'}
                  </span>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-sm text-base-content/70 mb-4 line-clamp-3">
                    {product.description}
                  </p>
                )}

                {/* Prix */}
                <div className="flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2">
                    <Euro className="w-5 h-5 text-success" />
                    <span className="text-2xl font-bold text-success">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                </div>

                {/* Badge statut */}
                <div className="card-actions justify-end mt-4">
                  <span className={`badge ${product.isActive ? 'badge-success' : 'badge-error'}`}>
                    {product.isActive ? 'Disponible' : 'Indisponible'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default SellerProducts