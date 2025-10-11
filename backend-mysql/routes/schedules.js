const express = require('express');
const { body, validationResult } = require('express-validator');
const { Schedule, User } = require('../models');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Validation des données d'horaire
const scheduleValidation = [
  body('date')
    .isISO8601()
    .withMessage('Date invalide'),
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de début invalide (format HH:MM)'),
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Heure de fin invalide (format HH:MM)'),
  body('location')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('La localisation ne peut pas dépasser 100 caractères'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Les notes ne peuvent pas dépasser 200 caractères'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive doit être un booléen')
];

// Validation personnalisée pour vérifier que l'heure de fin est après l'heure de début
const validateTimeRange = (req, res, next) => {
  const { startTime, endTime } = req.body;

  if (startTime && endTime) {
    const start = new Date(`2000-01-01T${startTime}:00`);
    const end = new Date(`2000-01-01T${endTime}:00`);

    if (start >= end) {
      return res.status(400).json({
        message: 'L\'heure de fin doit être postérieure à l\'heure de début'
      });
    }
  }

  next();
};

// Récupérer tous les horaires avec filtres
router.get('/', auth, async (req, res) => {
  try {
    const {
      userId,
      startDate,
      endDate,
      isActive,
      page = 1,
      limit = 50,
      sortBy = 'date',
      sortOrder = 'ASC'
    } = req.query;

    const where = {};
    const include = [{
      model: User,
      as: 'user',
      attributes: ['id', 'username', 'firstName', 'lastName']
    }];

    // Filtres
    if (req.user.role === 'vendeuse') {
      where.seller = req.user.id;
    } else if (userId && req.user.role === 'admin') {
      where.seller = userId;
    }

    if (startDate) {
      where.date = {
        [require('sequelize').Op.gte]: new Date(startDate)
      };
    }

    if (endDate) {
      if (where.date) {
        where.date[require('sequelize').Op.lte] = new Date(endDate);
      } else {
        where.date = {
          [require('sequelize').Op.lte]: new Date(endDate)
        };
      }
    }

    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    // Pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Tri
    const validSortFields = ['date', 'startTime', 'endTime', 'createdAt', 'updatedAt'];
    const validSortOrders = ['ASC', 'DESC'];

    const order = validSortFields.includes(sortBy) && validSortOrders.includes(sortOrder.toUpperCase())
      ? [[sortBy, sortOrder.toUpperCase()]]
      : [['date', 'ASC'], ['startTime', 'ASC']];

    const { count, rows: schedules } = await Schedule.findAndCountAll({
      where,
      include,
      limit: parseInt(limit),
      offset,
      order,
      distinct: true
    });

    res.json({
      schedules,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit)),
        totalItems: count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des horaires:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des horaires',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Récupérer un horaire par ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    });

    if (!schedule) {
      return res.status(404).json({ message: 'Horaire non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'vendeuse' && schedule.seller !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    res.json(schedule);

  } catch (error) {
    console.error('Erreur lors de la récupération de l\'horaire:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération de l\'horaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Créer un nouvel horaire
router.post('/', auth, scheduleValidation, validateTimeRange, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { date, startTime, endTime, location, notes, isActive = true } = req.body;
    let { userId, seller } = req.body;

    // Accepter aussi 'seller' comme alias pour 'userId' (compatibilité frontend)
    if (seller && !userId) {
      userId = seller;
    }

    // Si l'utilisateur est vendeuse, utiliser son ID
    if (req.user.role === 'vendeuse') {
      userId = req.user.id;
    } else if (req.user.role === 'admin' && !userId) {
      return res.status(400).json({ message: 'L\'ID utilisateur est requis' });
    }

    // Vérifier que l'utilisateur existe
    if (req.user.role === 'admin' && userId !== req.user.id) {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json({ message: 'Utilisateur non trouvé' });
      }
    }

    // Vérifier qu'il n'y a pas de conflit d'horaires pour le même utilisateur
    const conflictingSchedule = await Schedule.findOne({
      where: {
        seller: userId,
        date: new Date(date),
        isActive: true,
        [require('sequelize').Op.or]: [
          {
            [require('sequelize').Op.and]: [
              { startTime: { [require('sequelize').Op.lte]: startTime } },
              { endTime: { [require('sequelize').Op.gt]: startTime } }
            ]
          },
          {
            [require('sequelize').Op.and]: [
              { startTime: { [require('sequelize').Op.lt]: endTime } },
              { endTime: { [require('sequelize').Op.gte]: endTime } }
            ]
          },
          {
            [require('sequelize').Op.and]: [
              { startTime: { [require('sequelize').Op.gte]: startTime } },
              { endTime: { [require('sequelize').Op.lte]: endTime } }
            ]
          }
        ]
      }
    });

    if (conflictingSchedule) {
      return res.status(400).json({
        message: 'Il y a un conflit avec un horaire existant pour cette date et cet utilisateur'
      });
    }

    const schedule = await Schedule.create({
      seller: userId,
      date: new Date(date),
      startTime,
      endTime,
      location,
      notes,
      isActive
    });

    // Récupérer l'horaire créé avec l'utilisateur
    const createdSchedule = await Schedule.findByPk(schedule.id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    });

    res.status(201).json({
      message: 'Horaire créé avec succès',
      schedule: createdSchedule
    });

  } catch (error) {
    console.error('Erreur lors de la création de l\'horaire:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la création de l\'horaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mettre à jour un horaire
router.put('/:id', auth, scheduleValidation, validateTimeRange, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Données invalides',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { date, startTime, endTime, location, notes, isActive } = req.body;
    let { userId, seller } = req.body;

    // Accepter aussi 'seller' comme alias pour 'userId' (compatibilité frontend)
    if (seller && !userId) {
      userId = seller;
    }

    const schedule = await Schedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ message: 'Horaire non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'vendeuse' && schedule.seller !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    // Si l'utilisateur est vendeuse, ne pas permettre de changer l'userId
    if (req.user.role === 'vendeuse') {
      userId = schedule.seller;
    } else if (req.user.role === 'admin' && userId) {
      // Vérifier que l'utilisateur existe
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json({ message: 'Utilisateur non trouvé' });
      }
    } else {
      userId = schedule.seller;
    }

    // Vérifier qu'il n'y a pas de conflit d'horaires (excluant l'horaire actuel)
    const conflictingSchedule = await Schedule.findOne({
      where: {
        id: { [require('sequelize').Op.ne]: id },
        seller: userId,
        date: new Date(date),
        isActive: true,
        [require('sequelize').Op.or]: [
          {
            [require('sequelize').Op.and]: [
              { startTime: { [require('sequelize').Op.lte]: startTime } },
              { endTime: { [require('sequelize').Op.gt]: startTime } }
            ]
          },
          {
            [require('sequelize').Op.and]: [
              { startTime: { [require('sequelize').Op.lt]: endTime } },
              { endTime: { [require('sequelize').Op.gte]: endTime } }
            ]
          },
          {
            [require('sequelize').Op.and]: [
              { startTime: { [require('sequelize').Op.gte]: startTime } },
              { endTime: { [require('sequelize').Op.lte]: endTime } }
            ]
          }
        ]
      }
    });

    if (conflictingSchedule) {
      return res.status(400).json({
        message: 'Il y a un conflit avec un horaire existant pour cette date et cet utilisateur'
      });
    }

    await schedule.update({
      seller: userId,
      date: new Date(date),
      startTime,
      endTime,
      location,
      notes,
      isActive
    });

    // Récupérer l'horaire mis à jour avec l'utilisateur
    const updatedSchedule = await Schedule.findByPk(id, {
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }]
    });

    res.json({
      message: 'Horaire mis à jour avec succès',
      schedule: updatedSchedule
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour de l\'horaire:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la mise à jour de l\'horaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Supprimer un horaire
router.delete('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const schedule = await Schedule.findByPk(id);
    if (!schedule) {
      return res.status(404).json({ message: 'Horaire non trouvé' });
    }

    // Vérifier les permissions
    if (req.user.role === 'vendeuse' && schedule.userId !== req.user.id) {
      return res.status(403).json({ message: 'Accès refusé' });
    }

    await schedule.destroy();

    res.json({ message: 'Horaire supprimé avec succès' });

  } catch (error) {
    console.error('Erreur lors de la suppression de l\'horaire:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la suppression de l\'horaire',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtenir les horaires d'une semaine
router.get('/week/:date', auth, async (req, res) => {
  try {
    const { date } = req.params;
    const { userId } = req.query;

    const requestedDate = new Date(date);

    // Calculer le début et la fin de la semaine (lundi à dimanche)
    const dayOfWeek = requestedDate.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Si dimanche (0), aller 6 jours en arrière

    const startOfWeek = new Date(requestedDate);
    startOfWeek.setDate(requestedDate.getDate() + mondayOffset);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const where = {
      date: {
        [require('sequelize').Op.between]: [startOfWeek, endOfWeek]
      },
      isActive: true
    };

    // Filtrer par utilisateur selon les permissions
    if (req.user.role === 'vendeuse') {
      where.seller = req.user.id;
    } else if (userId) {
      where.seller = userId;
    }

    const schedules = await Schedule.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }],
      order: [['date', 'ASC'], ['startTime', 'ASC']]
    });

    // Organiser les horaires par jour
    const weekSchedules = {};
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      const dayKey = currentDay.toISOString().split('T')[0];
      weekSchedules[dayKey] = [];
    }

    schedules.forEach(schedule => {
      const dayKey = schedule.date.toISOString().split('T')[0];
      if (weekSchedules[dayKey]) {
        weekSchedules[dayKey].push(schedule);
      }
    });

    res.json({
      week: {
        startDate: startOfWeek.toISOString().split('T')[0],
        endDate: endOfWeek.toISOString().split('T')[0]
      },
      schedules: weekSchedules
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des horaires de la semaine:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des horaires',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Obtenir les horaires du jour
router.get('/today/:userId?', auth, async (req, res) => {
  try {
    const { userId } = req.params;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const where = {
      date: {
        [require('sequelize').Op.gte]: today,
        [require('sequelize').Op.lt]: tomorrow
      },
      isActive: true
    };

    // Filtrer par utilisateur selon les permissions
    if (req.user.role === 'vendeuse') {
      where.seller = req.user.id;
    } else if (userId) {
      where.seller = userId;
    }

    const schedules = await Schedule.findAll({
      where,
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'firstName', 'lastName']
      }],
      order: [['startTime', 'ASC']]
    });

    res.json({
      date: today.toISOString().split('T')[0],
      schedules
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des horaires du jour:', error);
    res.status(500).json({
      message: 'Erreur serveur lors de la récupération des horaires',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;