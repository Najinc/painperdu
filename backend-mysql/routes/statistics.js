const express = require('express');
const { Product, User, Inventory, InventoryItem, Schedule } = require('../models');
const { auth, authorize } = require('../middleware/auth');
const { Op, fn, col, literal } = require('sequelize');
const { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, format } = require('date-fns');

const router = express.Router();

// @route   GET /api/statistics/dashboard
// @desc    Obtenir les statistiques du tableau de bord
// @access  Private (Admin)
router.get('/dashboard', [auth, authorize('admin')], async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Période pour le calcul des moyennes (30 derniers jours)
    const thirtyDaysAgo = subDays(today, 30);
    const startOfPeriod = startOfDay(thirtyDaysAgo);

    console.log('📅 Dates de calcul:', {
      today: today.toISOString(),
      startOfToday: startOfToday.toISOString(),
      endOfToday: endOfToday.toISOString(),
      startOfPeriod: startOfPeriod.toISOString()
    });

    // Statistiques générales avec gestion d'erreurs
    let totalProducts = 0;
    let totalSellers = 0;
    try {
      totalProducts = await Product.count({ where: { isActive: true } });
      totalSellers = await User.count({ where: { role: 'vendeuse', isActive: true } });
    } catch (error) {
      console.error('Erreur lors du comptage des produits/vendeurs:', error);
    }

    console.log('📊 Statistiques de base:', {
      totalProducts,
      totalSellers
    });

    // Inventaires du jour avec gestion d'erreurs
    let todayInventories = [];
    try {
      todayInventories = await Inventory.findAll({
        where: {
          date: {
            [Op.between]: [startOfToday, endOfToday]
          }
        },
        include: [
          {
            model: InventoryItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['price']
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des inventaires du jour:', error);
      todayInventories = [];
    }

    console.log('📋 Inventaires du jour:', {
      count: todayInventories.length,
      inventories: todayInventories.map(inv => ({
        type: inv.type,
        totalValue: inv.totalValue || 0,
        itemsCount: inv.items ? inv.items.length : 0
      }))
    });

    const openingInventories = todayInventories.filter(inv => inv.type === 'ouverture');
    const closingInventories = todayInventories.filter(inv => inv.type === 'fermeture');

    // Valeur totale du stock d'ouverture et de fermeture avec vérification
    const openingValue = openingInventories.reduce((sum, inv) => sum + (parseFloat(inv.totalValue) || 0), 0);
    const closingValue = closingInventories.reduce((sum, inv) => sum + (parseFloat(inv.totalValue) || 0), 0);

    // Ventes estimées (différence entre ouverture et fermeture)
    const estimatedSales = Math.max(0, openingValue - closingValue);

    console.log('💰 Calculs financiers du jour:', {
      openingValue,
      closingValue,
      estimatedSales
    });

    // Calcul des ventes moyennes sur 30 jours
    let allPeriodInventories = [];
    try {
      allPeriodInventories = await Inventory.findAll({
        where: {
          date: {
            [Op.between]: [startOfPeriod, endOfToday]
          }
        },
        include: [
          {
            model: InventoryItem,
            as: 'items',
            include: [
              {
                model: Product,
                as: 'product',
                attributes: ['price']
              }
            ]
          }
        ]
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des inventaires de période:', error);
      allPeriodInventories = [];
    }

    const periodInventories = allPeriodInventories.filter(inv => inv.isConfirmed);
    const inventoriesToUse = periodInventories.length > 0 ? periodInventories : allPeriodInventories;

    console.log('📈 Inventaires de la période:', {
      totalCount: allPeriodInventories.length,
      confirmedCount: periodInventories.length,
      usedCount: inventoriesToUse.length
    });

    // Grouper les inventaires par date pour calculer les ventes quotidiennes
    const salesByDate = {};

    inventoriesToUse.forEach(inventory => {
      const dateKey = format(inventory.date, 'yyyy-MM-dd');

      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = {
          opening: 0,
          closing: 0,
          sales: 0
        };
      }

      const totalValue = parseFloat(inventory.totalValue) || 0;
      if (inventory.type === 'ouverture') {
        salesByDate[dateKey].opening += totalValue;
      } else if (inventory.type === 'fermeture') {
        salesByDate[dateKey].closing += totalValue;
      }
    });

    console.log('📊 Données par date:', salesByDate);

    // Calculer les ventes pour chaque jour et la moyenne
    const dailySales = Object.values(salesByDate).map(day => {
      day.sales = day.opening - day.closing;
      return day.sales;
    }).filter(sales => sales > 0);

    const totalSales = dailySales.reduce((sum, sales) => sum + sales, 0);
    const averageDailySales = dailySales.length > 0 ? totalSales / dailySales.length : 0;
    const numberOfSalesDays = dailySales.length;

    console.log('💰 Calculs de ventes:', {
      dailySales,
      totalSales,
      averageDailySales,
      numberOfSalesDays
    });

    // Planning du jour avec gestion d'erreurs
    let todaySchedules = [];
    try {
      todaySchedules = await Schedule.findAll({
        where: {
          date: {
            [Op.between]: [startOfToday.toISOString().split('T')[0], endOfToday.toISOString().split('T')[0]]
          },
          type: 'travail'
        },
        include: [
          {
            model: User,
            as: 'sellerInfo',
            attributes: ['firstName', 'lastName']
          }
        ]
      });
    } catch (error) {
      console.error('Erreur lors de la récupération des horaires:', error);
      todaySchedules = [];
    }

    const response = {
      overview: {
        totalProducts: totalProducts || 0,
        totalSellers: totalSellers || 0,
        openingInventories: openingInventories.length || 0,
        closingInventories: closingInventories.length || 0,
        workingToday: todaySchedules.length || 0
      },
      financial: {
        openingValue: (openingValue || 0).toFixed(2),
        closingValue: (closingValue || 0).toFixed(2),
        estimatedSales: (estimatedSales || 0).toFixed(2)
      },
      salesAnalytics: {
        averageDailySales: (averageDailySales || 0).toFixed(2),
        totalSalesLast30Days: (totalSales || 0).toFixed(2),
        numberOfSalesDays: numberOfSalesDays || 0,
        periodDays: 30
      },
      todaySchedules: todaySchedules.map(schedule => ({
        seller: schedule.sellerInfo ? `${schedule.sellerInfo.firstName || ''} ${schedule.sellerInfo.lastName || ''}`.trim() : 'Inconnu',
        startTime: schedule.startTime || '',
        endTime: schedule.endTime || ''
      }))
    };

    console.log('📤 Réponse finale:', JSON.stringify(response, null, 2));

    res.json(response);
  } catch (error) {
    console.error('Erreur critique dans dashboard:', error);

    // Réponse de secours pour éviter le crash
    res.status(500).json({
      message: 'Erreur lors de la récupération des statistiques',
      overview: {
        totalProducts: 0,
        totalSellers: 0,
        openingInventories: 0,
        closingInventories: 0,
        workingToday: 0
      },
      financial: {
        openingValue: "0.00",
        closingValue: "0.00",
        estimatedSales: "0.00"
      },
      salesAnalytics: {
        averageDailySales: "0.00",
        totalSalesLast30Days: "0.00",
        numberOfSalesDays: 0,
        periodDays: 30
      },
      todaySchedules: []
    });
  }
});

// @route   GET /api/statistics/period
// @desc    Obtenir les statistiques par période
// @access  Private (Admin)
router.get('/period', [auth, authorize('admin')], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les dates de début et de fin sont requises' });
    }

    const start = startOfDay(new Date(startDate));
    const end = endOfDay(new Date(endDate));

    // Inventaires sur la période
    const allInventories = await Inventory.findAll({
      where: {
        date: {
          [Op.between]: [start, end]
        }
      },
      include: [
        {
          model: InventoryItem,
          as: 'items',
          include: [
            {
              model: Product,
              as: 'product',
              attributes: ['price']
            }
          ]
        }
      ]
    });

    const confirmedInventories = allInventories.filter(inv => inv.isConfirmed);
    const inventories = confirmedInventories.length > 0 ? confirmedInventories : allInventories;

    console.log('📊 Statistiques période:', {
      totalInventories: allInventories.length,
      confirmedInventories: confirmedInventories.length,
      usedInventories: inventories.length,
      period: { startDate, endDate }
    });

    const openingInventories = inventories.filter(inv => inv.type === 'ouverture');
    const closingInventories = inventories.filter(inv => inv.type === 'fermeture');

    const openingValue = openingInventories.reduce((sum, inv) => sum + (parseFloat(inv.totalValue) || 0), 0);
    const closingValue = closingInventories.reduce((sum, inv) => sum + (parseFloat(inv.totalValue) || 0), 0);
    const estimatedSales = Math.max(0, openingValue - closingValue);

    // Données par jour
    const dailyData = {};
    inventories.forEach(inv => {
      const dateKey = format(new Date(inv.date), 'yyyy-MM-dd');
      if (!dailyData[dateKey]) {
        dailyData[dateKey] = {
          date: dateKey,
          openingValue: 0,
          closingValue: 0,
          sales: 0
        };
      }

      const totalValue = parseFloat(inv.totalValue) || 0;
      if (inv.type === 'ouverture') {
        dailyData[dateKey].openingValue += totalValue;
      } else {
        dailyData[dateKey].closingValue += totalValue;
      }

      dailyData[dateKey].sales = dailyData[dateKey].openingValue - dailyData[dateKey].closingValue;
    });

    res.json({
      summary: {
        totalOpeningValue: openingValue.toFixed(2),
        totalClosingValue: closingValue.toFixed(2),
        totalEstimatedSales: estimatedSales.toFixed(2),
        totalInventories: inventories.length
      },
      dailyData: Object.values(dailyData)
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de période:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/statistics/products
// @desc    Obtenir les statistiques par produit
// @access  Private (Admin)
router.get('/products', [auth, authorize('admin')], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validation des dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les dates de début et de fin sont requises' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Récupérer les statistiques par produit (pour l'instant, retourner des données vides)
    res.json({
      products: [],
      total: 0,
      message: 'Statistiques par produit - fonctionnalité en développement'
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques produits:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/statistics/sellers
// @desc    Obtenir les statistiques par vendeur
// @access  Private (Admin)
router.get('/sellers', [auth, authorize('admin')], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validation des dates
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Les dates de début et de fin sont requises' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Récupérer les statistiques par vendeur (pour l'instant, retourner des données vides)
    res.json({
      sellers: [],
      total: 0,
      message: 'Statistiques par vendeur - fonctionnalité en développement'
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques vendeurs:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;