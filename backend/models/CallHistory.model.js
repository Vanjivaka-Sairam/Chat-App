const mongoose = require('mongoose');

const callHistorySchema = new mongoose.Schema(
  {
    callId: {
      type: String,
      unique: true,
      required: true,
    },
    callerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    calleeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    duration: {
      type: Number, // in milliseconds
      default: 0,
    },
    status: {
      type: String,
      enum: ['completed', 'rejected', 'missed'],
      default: 'completed',
    },
    callType: {
      type: String,
      enum: ['audio', 'video'],
      default: 'video',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CallHistory', callHistorySchema);

