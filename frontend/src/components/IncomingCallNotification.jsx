import React, { useContext } from 'react';
import { WebRTCContext } from '../context/WebRTCContext';
import { Phone, PhoneOff } from 'lucide-react';

const IncomingCallNotification = () => {
  const { incomingCall, acceptCall, rejectCall } = useContext(WebRTCContext);

  if (!incomingCall) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-base-100 rounded-lg p-8 max-w-md w-full text-center shadow-xl">
        <div className="mb-6">
          <div className="w-24 h-24 bg-primary rounded-full mx-auto flex items-center justify-center text-4xl text-primary-content mb-4">
            {incomingCall.caller?.fullName?.charAt(0).toUpperCase() || '?'}
          </div>
          <h2 className="text-2xl font-bold">{incomingCall.caller?.fullName || 'Unknown'}</h2>
          <p className="text-base-content/70 mt-2">Incoming video call</p>
        </div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={rejectCall}
            className="btn btn-error btn-lg btn-circle"
          >
            <PhoneOff size={24} />
          </button>
          <button
            onClick={acceptCall}
            className="btn btn-success btn-lg btn-circle"
          >
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;

