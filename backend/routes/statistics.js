const express = require('express');
const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const Schedule = require('../models/Schedule');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');
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

    // Statistiques générales
    const totalProducts = await Product.countDocuments({ isActive: true });
    const totalSellers = await User.countDocuments({ role: 'vendeuse', isActive: true });

    // Inventaires du jour
    const todayInventories = await Inventory.find({
      date: { $gte: startOfToday, $lte: endOfToday }
    }).populate('items.product', 'price');

    const openingInventories = todayInventories.filter(inv => inv.type === 'ouverture');
    const closingInventories = todayInventories.filter(inv => inv.type === 'fermeture');

    // Valeur totale du stock d'ouverture et de fermeture
    const openingValue = openingInventories.reduce((sum, inv) => sum + inv.totalValue, 0);
    const closingValue = closingInventories.reduce((sum, inv) => sum + inv.totalValue, 0);

    // Ventes estimées (différence entre ouverture et fermeture)
    const estimatedSales = openingValue - closingValue;

    // Planning du jour
    const todaySchedules = await Schedule.find({
      date: { $gte: startOfToday, $lte: endOfToday },
      type: 'travail'
    }).populate('seller', 'firstName lastName');

    res.json({
      overview: {
        totalProducts,
        totalSellers,
        openingInventories: openingInventories.length,
        closingInventories: closingInventories.length,
        workingToday: todaySchedules.length
      },
      financial: {
        openingValue: openingValue.toFixed(2),
        closingValue: closingValue.toFixed(2),
        estimatedSales: estimatedSales.toFixed(2)
      },
      todaySchedules: todaySchedules.map(schedule => ({
        seller: `${schedule.seller.firstName} ${schedule.seller.lastName}`,
        startTime: schedule.startTime,
        endTime: schedule.endTime
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/statistics/sales
// @desc    Obtenir les statistiques de ventes
// @access  Private (Admin)
router.get('/sales', [auth, authorize('admin')], async (req, res) => {
  try {
    const { period = 'week', startDate, endDate } = req.query;

    let dateRange = {};
    const today = new Date();

    switch (period) {
      case 'day':
        dateRange = {
          $gte: startOfDay(today),
          $lte: endOfDay(today)
        };
        break;
      case 'week':
        dateRange = {
          $gte: startOfWeek(today, { weekStartsOn: 1 }),
          $lte: endOfWeek(today, { weekStartsOn: 1 })
        };
        break;
      case 'month':
        dateRange = {
          $gte: startOfMonth(today),
          $lte: endOfMonth(today)
        };
        break;
      case 'custom':
        if (startDate && endDate) {
          dateRange = {
            $gte: startOfDay(new Date(startDate)),
            $lte: endOfDay(new Date(endDate))
          };
        }
        break;
    }

    // Obtenir les inventaires d'ouverture et de fermeture pour la période
    const inventories = await Inventory.find({
      date: dateRange,
      isConfirmed: true
    })
      .populate('items.product', 'name price category')
      .populate('seller', 'firstName lastName')
      .sort({ date: 1 });

    // Grouper par date
    const salesByDate = {};

    inventories.forEach(inventory => {
      const dateKey = format(inventory.date, 'yyyy-MM-dd');

      if (!salesByDate[dateKey]) {
        salesByDate[dateKey] = {
          date: dateKey,
          opening: 0,
          closing: 0,
          sales: 0
        };
      }

      if (inventory.type === 'ouverture') {
        salesByDate[dateKey].opening += inventory.totalValue;
      } else {
        salesByDate[dateKey].closing += inventory.totalValue;
      }

      salesByDate[dateKey].sales = salesByDate[dateKey].opening - salesByDate[dateKey].closing;
    });

    const salesData = Object.values(salesByDate);
    const totalSales = salesData.reduce((sum, day) => sum + day.sales, 0);
    const averageSales = salesData.length > 0 ? totalSales / salesData.length : 0;

    res.json({
      period,
      totalSales: totalSales.toFixed(2),
      averageSales: averageSales.toFixed(2),
      salesByDate: salesData
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des ventes:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/statistics/products
// @desc    Obtenir les statistiques par produit
// @access  Private (Admin)
router.get('/products', [auth, authorize('admin')], async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    let dateRange = {};
    const today = new Date();

    switch (period) {
      case 'week':
        dateRange = {
          $gte: startOfWeek(today, { weekStartsOn: 1 }),
          $lte: endOfWeek(today, { weekStartsOn: 1 })
        };
        break;
      case 'month':
        dateRange = {
          $gte: startOfMonth(today),
          $lte: endOfMonth(today)
        };
        break;
    }

    // Agrégation pour obtenir les ventes par produit
    const productStats = await Inventory.aggregate([
      {
        $match: {
          date: dateRange,
          isConfirmed: true
        }
      },
      {
        $unwind: '$items'
      },
      {
        $group: {
          _id: {
            product: '$items.product',
            type: '$type'
          },
          totalQuantity: { $sum: '$items.quantity' },
          totalValue: { $sum: { $multiply: ['$items.quantity', '$items.product.price'] } }
        }
      },
      {
        $group: {
          _id: '$_id.product',
          opening: {
            $sum: {
              $cond: [
                { $eq: ['$_id.type', 'ouverture'] },
                '$totalQuantity',
                0
              ]
            }
          },
          closing: {
            $sum: {
              $cond: [
                { $eq: ['$_id.type', 'fermeture'] },
                '$totalQuantity',
                0
              ]
            }
          },
          openingValue: {
            $sum: {
              $cond: [
                { $eq: ['$_id.type', 'ouverture'] },
                '$totalValue',
                0
              ]
            }
          },
          closingValue: {
            $sum: {
              $cond: [
                { $eq: ['$_id.type', 'fermeture'] },
                '$totalValue',
                0
              ]
            }
          }
        }
      },
      {
        $addFields: {
          soldQuantity: { $subtract: ['$opening', '$closing'] },
          salesValue: { $subtract: ['$openingValue', '$closingValue'] }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'product.category',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $project: {
          product: {
            _id: '$product._id',
            name: '$product.name',
            price: '$product.price',
            category: '$category.name'
          },
          opening: 1,
          closing: 1,
          soldQuantity: 1,
          salesValue: 1
        }
      },
      {
        $sort: { salesValue: -1 }
      }
    ]);

    const totalSalesValue = productStats.reduce((sum, item) => sum + item.salesValue, 0);

    res.json({
      period,
      totalSalesValue: totalSalesValue.toFixed(2),
      productStats: productStats.map(item => ({
        ...item,
        salesValue: item.salesValue.toFixed(2)
      }))
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques produits:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/statistics/waste
// @desc    Obtenir les statistiques de gaspillage
// @access  Private (Admin)
router.get('/waste', [auth, authorize('admin')], async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const endDate = new Date();
    const startDate = subDays(endDate, parseInt(days));

    // Obtenir les inventaires de fermeture pour calculer les invendus
    const closingInventories = await Inventory.find({
      type: 'fermeture',
      date: { $gte: startDate, $lte: endDate },
      isConfirmed: true
    })
      .populate('items.product', 'name price category')
      .sort({ date: -1 });

    const wasteByDate = {};
    let totalWaste = 0;

    closingInventories.forEach(inventory => {
      const dateKey = format(inventory.date, 'yyyy-MM-dd');

      if (!wasteByDate[dateKey]) {
        wasteByDate[dateKey] = {
          date: dateKey,
          items: [],
          totalValue: 0
        };
      }

      inventory.items.forEach(item => {
        const wasteValue = item.quantity * item.product.price;
        wasteByDate[dateKey].items.push({
          product: item.product.name,
          quantity: item.quantity,
          value: wasteValue.toFixed(2)
        });
        wasteByDate[dateKey].totalValue += wasteValue;
        totalWaste += wasteValue;
      });
    });

    const wasteData = Object.values(wasteByDate).map(day => ({
      ...day,
      totalValue: day.totalValue.toFixed(2)
    }));

    res.json({
      period: `${days} derniers jours`,
      totalWaste: totalWaste.toFixed(2),
      averageWastePerDay: (totalWaste / parseInt(days)).toFixed(2),
      wasteByDate: wasteData
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de gaspillage:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/statistics/period
// @desc    Obtenir les statistiques sur une période
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
    const inventories = await Inventory.find({
      date: { $gte: start, $lte: end }
    }).populate('items.product', 'price category');

    const openingInventories = inventories.filter(inv => inv.type === 'ouverture');
    const closingInventories = inventories.filter(inv => inv.type === 'fermeture');

    const openingValue = openingInventories.reduce((sum, inv) => sum + inv.totalValue, 0);
    const closingValue = closingInventories.reduce((sum, inv) => sum + inv.totalValue, 0);
    const estimatedSales = openingValue - closingValue;

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

      if (inv.type === 'ouverture') {
        dailyData[dateKey].openingValue += inv.totalValue;
      } else {
        dailyData[dateKey].closingValue += inv.totalValue;
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

// @route   GET /api/statistics/sellers
// @desc    Obtenir les statistiques par vendeur
// @access  Private (Admin)
router.get('/sellers', [auth, authorize('admin')], async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: startOfDay(new Date(startDate)),
          $lte: endOfDay(new Date(endDate))
        }
      };
    }

    // Inventaires par vendeur
    const inventories = await Inventory.find(dateFilter)
      .populate('seller', 'name email')
      .populate('items.product', 'price');

    // Grouper par vendeur
    const sellerStats = {};
    inventories.forEach(inv => {
      const sellerId = inv.seller._id.toString();
      if (!sellerStats[sellerId]) {
        sellerStats[sellerId] = {
          seller: inv.seller,
          totalInventories: 0,
          openingInventories: 0,
          closingInventories: 0,
          totalValue: 0,
          averageValue: 0
        };
      }

      sellerStats[sellerId].totalInventories++;
      if (inv.type === 'ouverture') {
        sellerStats[sellerId].openingInventories++;
      } else {
        sellerStats[sellerId].closingInventories++;
      }
      sellerStats[sellerId].totalValue += inv.totalValue;
    });

    // Calculer les moyennes
    Object.values(sellerStats).forEach(stats => {
      stats.averageValue = stats.totalInventories > 0
        ? (stats.totalValue / stats.totalInventories).toFixed(2)
        : 0;
      stats.totalValue = stats.totalValue.toFixed(2);
    });

    res.json(Object.values(sellerStats));
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques par vendeur:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;