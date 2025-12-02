import React, { useState, useEffect } from 'react';
import { rostersService, Player } from '../../services/firebaseRosters';

interface RostersViewProps {
  teamId?: string;
  isAdmin?: boolean;
}

export const RostersView: React.FC<RostersViewProps> = ({ teamId, isAdmin = false }) => {
  const [roster, setRoster] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    number: '',
    position: '',
  });

  useEffect(() => {
    if (teamId) {
      loadRoster();
    }
  }, [teamId]);

  const loadRoster = async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const players = await rostersService.getTeamRoster(teamId);
      setRoster(players);
    } catch (err) {
      console.error('❌ Error loading roster:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!teamId || !formData.name || !formData.number || !formData.position) {
      alert('Please fill in all fields');
      return;
    }

    try {
      if (editingPlayer) {
        await rostersService.updatePlayer(teamId, editingPlayer.id, {
          name: formData.name,
          number: parseInt(formData.number),
          position: formData.position,
        });
      } else {
        await rostersService.addPlayer(teamId, {
          name: formData.name,
          number: parseInt(formData.number),
          position: formData.position,
        });
      }

      setFormData({ name: '', number: '', position: '' });
      setEditingPlayer(null);
      setShowForm(false);
      await loadRoster();
    } catch (err) {
      console.error('❌ Error saving player:', err);
      alert('Failed to save player');
    }
  };

  const handleEdit = (player: Player) => {
    setEditingPlayer(player);
    setFormData({
      name: player.name,
      number: player.number.toString(),
      position: player.position,
    });
    setShowForm(true);
  };

  const handleDelete = async (playerId: string) => {
    if (confirm('Are you sure you want to remove this player?')) {
      try {
        if (teamId) {
          await rostersService.removePlayer(teamId, playerId);
          await loadRoster();
        }
      } catch (err) {
        console.error('❌ Error deleting player:', err);
        alert('Failed to remove player');
      }
    }
  };

  const positions = ['Pitcher', 'Catcher', 'Infielder', 'Outfielder', 'Other'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Team Roster</h2>
        {isAdmin && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingPlayer(null);
              setFormData({ name: '', number: '', position: '' });
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            {showForm ? 'Cancel' : '+ Add Player'}
          </button>
        )}
      </div>

      {/* Form */}
      {isAdmin && showForm && (
        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Player Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g., John Doe"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Jersey Number
                </label>
                <input
                  type="number"
                  name="number"
                  value={formData.number}
                  onChange={handleInputChange}
                  placeholder="e.g., 23"
                  min="1"
                  max="99"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Position
                </label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                  required
                >
                  <option value="">Select position</option>
                  {positions.map(pos => (
                    <option key={pos} value={pos}>{pos}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                {editingPlayer ? 'Update Player' : 'Add Player'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPlayer(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Roster List */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading roster...</div>
      ) : roster.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No players on roster yet</div>
      ) : (
        <div className="grid gap-4">
          {roster.map(player => (
            <div
              key={player.id}
              className="p-4 bg-slate-800 border border-slate-700 rounded-lg flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                  #{player.number}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{player.name}</h3>
                  <p className="text-sm text-gray-400">{player.position}</p>
                </div>
              </div>

              {isAdmin && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(player)}
                    className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(player.id)}
                    className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RostersView;
