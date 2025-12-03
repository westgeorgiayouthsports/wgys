import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTeamRegistrations } from '../../store/slices/registrationsSlice';
import type { Registration } from '../../services/firebaseRegistrations';
import { registrationsService } from '../../services/firebaseRegistrations';
import type { Player } from '../../services/firebaseRosters';
import { rostersService } from '../../services/firebaseRosters';
import type { RootState } from '../../store/store';

interface RegistrationsViewProps {
  teamId?: string;
  isAdmin?: boolean;
}

export const RegistrationsView: React.FC<RegistrationsViewProps> = ({ teamId, isAdmin = false }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { registrations, loading, error } = useSelector((state: RootState) => state.registrations);
  
  const [showForm, setShowForm] = useState(false);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [rosterPlayers, setRosterPlayers] = useState<Player[]>([]);
  const [loadingRoster, setLoadingRoster] = useState(false);
  
  const [formData, setFormData] = useState({
    playerName: '',
    playerAge: '',
    playerPosition: '',
    playerJerseyNumber: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    fee: '150',
  });

  const [paymentData, setPaymentData] = useState({
    selectedPayment: 'stripe' as 'stripe' | 'paypal' | 'square' | 'check' | 'cash',
    cardNumber: '',
    cardExpiry: '',
    cardCVC: '',
    cardName: '',
  });

  useEffect(() => {
    if (teamId) {
      (dispatch as any)(fetchTeamRegistrations(teamId));
      loadRoster();
    }
  }, [teamId, dispatch]);

  const loadRoster = async () => {
    if (!teamId) return;
    setLoadingRoster(true);
    try {
      const players = await rostersService.getTeamRoster(teamId);
      setRosterPlayers(players);
    } catch (err) {
      console.error('❌ Error loading roster:', err);
    } finally {
      setLoadingRoster(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePaymentChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPaymentData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    if (!formData.playerName.trim()) {
      alert('Please enter player name');
      return false;
    }
    if (!formData.playerAge || parseInt(formData.playerAge) < 4 || parseInt(formData.playerAge) > 18) {
      alert('Please enter a valid age (4-18)');
      return false;
    }
    if (!formData.parentName.trim()) {
      alert('Please enter parent/guardian name');
      return false;
    }
    if (!formData.parentEmail.trim()) {
      alert('Please enter parent email');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.parentEmail)) {
      alert('Please enter a valid email');
      return false;
    }
    if (!formData.parentPhone.trim()) {
      alert('Please enter parent phone');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamId || !validateForm()) {
      return;
    }

    try {
      // Create registration
      const registration = await registrationsService.createRegistration(
        teamId,
        formData.playerName,
        parseInt(formData.playerAge),
        formData.playerPosition || '',
        formData.parentName,
        formData.parentEmail,
        formData.parentPhone,
        parseInt(formData.fee),
        paymentData.selectedPayment
      );

      // Process payment if selected payment method requires it
      if (paymentData.selectedPayment !== 'check' && paymentData.selectedPayment !== 'cash') {
        // In production, integrate with actual payment processor
        // For now, mark as pending payment
        await registrationsService.updateRegistration(registration.id, {
          paymentMethod: paymentData.selectedPayment,
          status: 'pending',
        });
      } else {
        await registrationsService.updateRegistration(registration.id, {
          paymentMethod: paymentData.selectedPayment,
          status: 'pending',
        });
      }

      // Reset form
      setFormData({
        playerName: '',
        playerAge: '',
        playerPosition: '',
        playerJerseyNumber: '',
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        fee: '150',
      });
      setPaymentData({
        selectedPayment: 'stripe',
        cardNumber: '',
        cardExpiry: '',
        cardCVC: '',
        cardName: '',
      });
      setShowForm(false);

      // Refresh list
      if (teamId) {
        (dispatch as any)(fetchTeamRegistrations(teamId));
      }

      alert('Registration submitted successfully!');
    } catch (err) {
      console.error('❌ Error creating registration:', err);
      alert('Failed to submit registration');
    }
  };

  const handleLinkToRoster = async (registrationId: string, playerId: string) => {
    try {
      // await registrationsService.linkToRoster(registrationId, playerId);
      if (teamId) {
        (dispatch as any)(fetchTeamRegistrations(teamId));
      }
      alert('Player linked to roster successfully!');
    } catch (err) {
      console.error('❌ Error linking to roster:', err);
      alert('Failed to link to roster');
    }
  };

  const handleApproveRegistration = async (regId: string) => {
    try {
      await registrationsService.approveRegistration(regId);
      if (teamId) {
        (dispatch as any)(fetchTeamRegistrations(teamId));
      }
      alert('Registration approved!');
    } catch (err) {
      console.error('❌ Error approving registration:', err);
      alert('Failed to approve registration');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'pending':
      return 'bg-yellow-500/20 text-yellow-300';
    case 'approved':
      return 'bg-blue-500/20 text-blue-300';
    case 'paid':
      return 'bg-green-500/20 text-green-300';
    default:
      return 'bg-gray-500/20 text-gray-300';
    }
  };

  const getPaymentMethodLabel = (method?: string) => {
    switch (method) {
    case 'stripe':
      return 'Stripe (Credit Card)';
    case 'paypal':
      return 'PayPal';
    case 'square':
      return 'Square';
    case 'check':
      return 'Check';
    case 'cash':
      return 'Cash';
    default:
      return 'Not specified';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Team Registrations</h2>
        <button
          onClick={() => { setShowForm(!showForm); }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
        >
          {showForm ? 'Cancel' : '+ New Registration'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500 text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Registration Form */}
      {showForm && (
        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700 space-y-4">
          <h3 className="text-lg font-semibold text-white">Player Registration Form</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Player Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-300">Player Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="playerName"
                  placeholder="Player Name *"
                  value={formData.playerName}
                  onChange={handleInputChange}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  name="playerAge"
                  placeholder="Age (4-18) *"
                  min="4"
                  max="18"
                  value={formData.playerAge}
                  onChange={handleInputChange}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="text"
                  name="playerPosition"
                  placeholder="Position (optional)"
                  value={formData.playerPosition}
                  onChange={handleInputChange}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="number"
                  name="playerJerseyNumber"
                  placeholder="Jersey # (optional)"
                  value={formData.playerJerseyNumber}
                  onChange={handleInputChange}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Parent Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-300">Parent/Guardian Information</h4>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="text"
                  name="parentName"
                  placeholder="Parent Name *"
                  value={formData.parentName}
                  onChange={handleInputChange}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="email"
                  name="parentEmail"
                  placeholder="Parent Email *"
                  value={formData.parentEmail}
                  onChange={handleInputChange}
                  className="px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="tel"
                  name="parentPhone"
                  placeholder="Parent Phone *"
                  value={formData.parentPhone}
                  onChange={handleInputChange}
                  className="col-span-2 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Fee */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-300">Registration Fee</h4>
              <div className="flex items-center gap-3">
                <span className="text-gray-400">$</span>
                <input
                  type="number"
                  name="fee"
                  value={formData.fee}
                  onChange={handleInputChange}
                  className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Payment Method */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-300">Payment Method</h4>
              <select
                name="selectedPayment"
                value={paymentData.selectedPayment}
                onChange={handlePaymentChange}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="stripe">Stripe (Credit/Debit Card)</option>
                <option value="paypal">PayPal</option>
                <option value="square">Square</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
              </select>

              {/* Card Payment Fields */}
              {(paymentData.selectedPayment === 'stripe' || paymentData.selectedPayment === 'square') && (
                <div className="space-y-3 p-3 bg-slate-700 rounded border border-slate-600">
                  <input
                    type="text"
                    name="cardName"
                    placeholder="Cardholder Name"
                    value={paymentData.cardName}
                    onChange={handlePaymentChange}
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <input
                    type="text"
                    name="cardNumber"
                    placeholder="Card Number (4111 1111 1111 1111)"
                    value={paymentData.cardNumber}
                    onChange={handlePaymentChange}
                    maxLength={19}
                    className="w-full px-4 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      name="cardExpiry"
                      placeholder="MM/YY"
                      value={paymentData.cardExpiry}
                      onChange={handlePaymentChange}
                      maxLength={5}
                      className="px-4 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      name="cardCVC"
                      placeholder="CVC"
                      value={paymentData.cardCVC}
                      onChange={handlePaymentChange}
                      maxLength={4}
                      className="px-4 py-2 bg-slate-600 border border-slate-500 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    💳 Test Card: 4111 1111 1111 1111 | Any future date | Any CVC
                  </p>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium"
            >
              Submit Registration
            </button>
          </form>
        </div>
      )}

      {/* Registrations List */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading registrations...</div>
      ) : registrations.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No registrations yet</div>
      ) : (
        <div className="grid gap-4">
          {registrations.map(reg => (
            <div
              key={reg.id}
              className="p-6 bg-slate-800 border border-slate-700 rounded-lg space-y-4"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">{reg.playerName}</h3>
                  <p className="text-sm text-gray-400">Age {reg.playerAge}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(reg.status)}`}>
                  {reg.status}
                </span>
              </div>

              {/* Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-400">Position</p>
                  <p className="text-white">{reg.playerPosition || 'Not specified'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Jersey #</p>
                  <p className="text-white">{(reg as any).playerJerseyNumber || 'Not assigned'}</p>
                </div>
                <div>
                  <p className="text-gray-400">Parent</p>
                  <p className="text-white">{reg.parentName}</p>
                </div>
                <div>
                  <p className="text-gray-400">Email</p>
                  <p className="text-white">{reg.parentEmail}</p>
                </div>
                <div>
                  <p className="text-gray-400">Phone</p>
                  <p className="text-white">{(reg as any).parentPhone}</p>
                </div>
                <div>
                  <p className="text-gray-400">Fee</p>
                  <p className="text-white">${reg.fee}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-gray-400">Payment Method</p>
                  <p className="text-white">{getPaymentMethodLabel(reg.paymentMethod)}</p>
                </div>
              </div>

              {/* Roster Assignment */}
              {isAdmin && (
                <div className="space-y-3 p-3 bg-slate-700 rounded">
                  <p className="text-sm font-medium text-gray-300">Link to Roster</p>
                  {loadingRoster ? (
                    <p className="text-xs text-gray-400">Loading roster...</p>
                  ) : rosterPlayers.length === 0 ? (
                    <p className="text-xs text-gray-400">No roster players available</p>
                  ) : (
                    <select
                      value={(reg as any).rosterPlayerId || ''}
                      onChange={(e) => {
                        if (e.target.value) {
                          handleLinkToRoster(reg.id, e.target.value);
                        }
                      }}
                      className="w-full px-3 py-2 bg-slate-600 border border-slate-500 rounded text-white text-sm focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select player...</option>
                      {rosterPlayers.map(player => (
                        <option key={player.id} value={player.id}>
                          {player.name} (#{player.number})
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex gap-2">
                  {reg.status === 'pending' && (
                    <button
                      onClick={() => handleApproveRegistration(reg.id)}
                      className="flex-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded transition"
                    >
                      Approve
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RegistrationsView;