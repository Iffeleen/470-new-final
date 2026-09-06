const mongoose = require('mongoose');

const consumptionRecordSchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      required: true,
      index: true
    },
    materialId: {
      type: String,
      default: null
    },
    materialName: {
      type: String,
      required: true,
      trim: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 0
    },
    unit: {
      type: String,
      required: true,
      default: 'kg',
      trim: true
    },
    unitCost: {
      type: Number,
      required: true,
      min: 0
    },
    totalCost: {
      type: Number,
      required: true,
      min: 0
    },
    currency: {
      type: String,
      required: true,
      default: 'BDT',
      uppercase: true
    },
    normalizedTotalCost: {
      type: Number,
      required: true,
      min: 0
    },
    consumedAt: {
      type: Date,
      required: true,
      default: Date.now
    },
    source: {
      type: String,
      default: 'module3_demo'
    },
    sourceReference: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

consumptionRecordSchema.index({ companyId: 1, consumedAt: -1 });
consumptionRecordSchema.index({ companyId: 1, materialId: 1, consumedAt: -1 });

const ConsumptionRecord = mongoose.model('ConsumptionRecord', consumptionRecordSchema);

module.exports = {
  ConsumptionRecord
};
