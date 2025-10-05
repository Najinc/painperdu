const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'La vendeuse est requise']
  },
  date: {
    type: Date,
    required: [true, 'La date est requise']
  },
  startTime: {
    type: String,
    required: [true, 'L\'heure de début est requise'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'heure invalide (HH:MM)']
  },
  endTime: {
    type: String,
    required: [true, 'L\'heure de fin est requise'],
    match: [/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Format d\'heure invalide (HH:MM)']
  },
  type: {
    type: String,
    enum: ['travail', 'congé', 'maladie', 'formation'],
    default: 'travail'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Les notes ne peuvent pas dépasser 500 caractères']
  },
  isConfirmed: {
    type: Boolean,
    default: false
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Validation personnalisée pour s'assurer que endTime > startTime
scheduleSchema.pre('save', function (next) {
  if (this.type === 'travail') {
    const start = this.startTime.split(':').map(Number);
    const end = this.endTime.split(':').map(Number);

    const startMinutes = start[0] * 60 + start[1];
    const endMinutes = end[0] * 60 + end[1];

    if (endMinutes <= startMinutes) {
      next(new Error('L\'heure de fin doit être postérieure à l\'heure de début'));
    }
  }
  next();
});

// Index composé pour éviter les doublons de planning
scheduleSchema.index({ seller: 1, date: 1 }, { unique: true });
scheduleSchema.index({ date: 1 });
scheduleSchema.index({ seller: 1 });

module.exports = mongoose.model('Schedule', scheduleSchema);