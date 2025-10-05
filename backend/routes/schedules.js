const express = require('express');
const { body, validationResult } = require('express-validator');
const Schedule = require('../models/Schedule');
const { auth, authorize, authorizeOwnerOrAdmin } = require('../middleware/auth');
const { startOfWeek, endOfWeek, parseISO } = require('date-fns');

const router = express.Router();

// @route   GET /api/schedules
// @desc    Obtenir les plannings
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { seller, week, month, year } = req.query;

    let query = {};

    // Si c'est une vendeuse, elle ne peut voir que son planning
    if (req.user.role === 'vendeuse') {
      query.seller = req.user._id;
    } else if (seller) {
      query.seller = seller;
    }

    // Filtrage par date
    if (week && year) {
      const weekDate = new Date(year, 0, (week - 1) * 7 + 1);
      const start = startOfWeek(weekDate, { weekStartsOn: 1 }); // Lundi
      const end = endOfWeek(weekDate, { weekStartsOn: 1 });
      query.date = { $gte: start, $lte: end };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      query.date = { $gte: start, $lte: end };
    }

    const schedules = await Schedule.find(query)
      .populate('seller', 'username firstName lastName email')
      .populate('createdBy', 'username email')
      .sort({ date: 1, startTime: 1 });

    res.json(schedules);
  } catch (error) {
    console.error('Erreur lors de la récupération des plannings:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/schedules/my-schedule
// @desc    Obtenir le planning de la vendeuse connectée
// @access  Private (Vendeuse/Vendeur)
router.get('/my-schedule', auth, async (req, res) => {
  try {
    // Vérifier que l'utilisateur est vendeur
    if (req.user.role !== 'vendeuse' && req.user.role !== 'vendeur') {
      return res.status(403).json({ message: 'Accès refusé - Vendeur requis' });
    }

    const { startDate, endDate, week, month, year } = req.query;

    let query = { seller: req.user._id };

    // Filtrage par date avec startDate/endDate (priorité)
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (week && year) {
      const weekDate = new Date(year, 0, (week - 1) * 7 + 1);
      const start = startOfWeek(weekDate, { weekStartsOn: 1 });
      const end = endOfWeek(weekDate, { weekStartsOn: 1 });
      query.date = { $gte: start, $lte: end };
    } else if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      query.date = { $gte: start, $lte: end };
    }

    const schedules = await Schedule.find(query)
      .populate('createdBy', 'username email')
      .sort({ date: 1, startTime: 1 });

    res.json(schedules);
  } catch (error) {
    console.error('Erreur lors de la récupération du planning:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   GET /api/schedules/:id
// @desc    Obtenir un planning par ID
// @access  Private
router.get('/:id', [auth, authorizeOwnerOrAdmin], async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id)
      .populate('seller', 'username firstName lastName email')
      .populate('createdBy', 'username email');

    if (!schedule) {
      return res.status(404).json({ message: 'Planning non trouvé' });
    }

    res.json(schedule);
  } catch (error) {
    console.error('Erreur lors de la récupération du planning:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   POST /api/schedules
// @desc    Créer un nouveau planning
// @access  Private (Admin)
router.post('/', [
  auth,
  authorize('admin'),
  body('seller')
    .notEmpty()
    .withMessage('La vendeuse est requise')
    .isMongoId()
    .withMessage('ID de vendeuse invalide'),
  body('date')
    .notEmpty()
    .withMessage('La date est requise')
    .isISO8601()
    .withMessage('Format de date invalide'),
  body('startTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Format d\'heure de début invalide (HH:MM)'),
  body('endTime')
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Format d\'heure de fin invalide (HH:MM)'),
  body('type')
    .optional()
    .isIn(['travail', 'congé', 'maladie', 'formation'])
    .withMessage('Type de planning invalide'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent pas dépasser 500 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { seller, date, startTime, endTime, type, notes } = req.body;

    // Vérifier que la vendeuse existe
    const User = require('../models/User');
    const sellerDoc = await User.findOne({ _id: seller, role: 'vendeuse', isActive: true });
    if (!sellerDoc) {
      return res.status(400).json({ message: 'Vendeuse non trouvée ou inactive' });
    }

    // Vérifier qu'il n'y a pas déjà un planning pour cette vendeuse à cette date
    const existingSchedule = await Schedule.findOne({
      seller,
      date: new Date(date)
    });

    if (existingSchedule) {
      return res.status(400).json({
        message: 'Un planning existe déjà pour cette vendeuse à cette date'
      });
    }

    const schedule = new Schedule({
      seller,
      date: new Date(date),
      startTime,
      endTime,
      type,
      notes,
      createdBy: req.user._id
    });

    await schedule.save();
    await schedule.populate([
      { path: 'seller', select: 'username firstName lastName email' },
      { path: 'createdBy', select: 'username email' }
    ]);

    res.status(201).json({
      message: 'Planning créé avec succès',
      schedule
    });
  } catch (error) {
    console.error('Erreur lors de la création du planning:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   PUT /api/schedules/:id
// @desc    Mettre à jour un planning
// @access  Private (Admin)
router.put('/:id', [
  auth,
  authorize('admin'),
  body('date')
    .optional()
    .isISO8601()
    .withMessage('Format de date invalide'),
  body('startTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Format d\'heure de début invalide (HH:MM)'),
  body('endTime')
    .optional()
    .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Format d\'heure de fin invalide (HH:MM)'),
  body('type')
    .optional()
    .isIn(['travail', 'congé', 'maladie', 'formation'])
    .withMessage('Type de planning invalide'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Les notes ne peuvent pas dépasser 500 caractères')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Erreurs de validation',
        errors: errors.array()
      });
    }

    const { date, startTime, endTime, type, notes, isConfirmed } = req.body;

    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ message: 'Planning non trouvé' });
    }

    // Vérifier les conflits si la date change
    if (date && new Date(date).getTime() !== schedule.date.getTime()) {
      const existingSchedule = await Schedule.findOne({
        seller: schedule.seller,
        date: new Date(date),
        _id: { $ne: schedule._id }
      });

      if (existingSchedule) {
        return res.status(400).json({
          message: 'Un planning existe déjà pour cette vendeuse à cette date'
        });
      }
    }

    if (date !== undefined) schedule.date = new Date(date);
    if (startTime !== undefined) schedule.startTime = startTime;
    if (endTime !== undefined) schedule.endTime = endTime;
    if (type !== undefined) schedule.type = type;
    if (notes !== undefined) schedule.notes = notes;
    if (isConfirmed !== undefined) schedule.isConfirmed = isConfirmed;

    await schedule.save();
    await schedule.populate([
      { path: 'seller', select: 'username firstName lastName email' },
      { path: 'createdBy', select: 'username email' }
    ]);

    res.json({
      message: 'Planning mis à jour avec succès',
      schedule
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du planning:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

// @route   DELETE /api/schedules/:id
// @desc    Supprimer un planning
// @access  Private (Admin)
router.delete('/:id', [auth, authorize('admin')], async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);

    if (!schedule) {
      return res.status(404).json({ message: 'Planning non trouvé' });
    }

    await Schedule.deleteOne({ _id: req.params.id });

    res.json({ message: 'Planning supprimé avec succès' });
  } catch (error) {
    console.error('Erreur lors de la suppression du planning:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
});

module.exports = router;