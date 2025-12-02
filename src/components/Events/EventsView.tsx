import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { fetchTeamEvents } from '../../store/slices/eventsSlice';
import { eventsService, Event } from '../../services/firebaseEvents';
import type { RootState } from '../../store/store';

interface EventsViewProps {
  teamId?: string;
  isAdmin?: boolean;
}

export const EventsView: React.FC<EventsViewProps> = ({ teamId, isAdmin = false }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const { events, loading, error } = useSelector((state: RootState) => state.events);
  
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    type: 'practice' as const,
    date: '',
    location: '',
    description: '',
  });

  useEffect(() => {
    if (teamId) {
      dispatch(fetchTeamEvents(teamId));
    }
  }, [teamId, dispatch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamId) {
      alert('Team ID is required');
      return;
    }

    try {
      if (editingEvent) {
        await eventsService.updateEvent(editingEvent.id, {
          ...formData,
        });
      } else {
        await eventsService.createEvent({
          teamId,
          ...formData,
        });
      }
      
      setFormData({
        title: '',
        type: 'practice',
        date: '',
        location: '',
        description: '',
      });
      setEditingEvent(null);
      setShowForm(false);
      
      if (teamId) {
        dispatch(fetchTeamEvents(teamId));
      }
    } catch (err) {
      console.error('❌ Error saving event:', err);
      alert('Failed to save event');
    }
  };

  const handleEdit = (event: Event) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      type: event.type,
      date: event.date,
      location: event.location,
      description: event.description,
    });
    setShowForm(true);
  };

  const handleDelete = async (eventId: string) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsService.deleteEvent(eventId);
        if (teamId) {
          dispatch(fetchTeamEvents(teamId));
        }
      } catch (err) {
        console.error('❌ Error deleting event:', err);
        alert('Failed to delete event');
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'practice':
        return 'bg-blue-500/20 text-blue-300';
      case 'game':
        return 'bg-green-500/20 text-green-300';
      case 'tournament':
        return 'bg-purple-500/20 text-purple-300';
      default:
        return 'bg-gray-500/20 text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Schedule & Events</h2>
        {isAdmin && (
          <button
            onClick={() => {
              setShowForm(!showForm);
              setEditingEvent(null);
              setFormData({
                title: '',
                type: 'practice',
                date: '',
                location: '',
                description: '',
              });
            }}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            {showForm ? 'Cancel' : '+ Add Event'}
          </button>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500 text-red-300 rounded-lg">
          {error}
        </div>
      )}

      {/* Form */}
      {isAdmin && showForm && (
        <div className="p-6 bg-slate-800 rounded-lg border border-slate-700">
          <h3 className="text-lg font-semibold text-white mb-4">
            {editingEvent ? 'Edit Event' : 'Create New Event'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="e.g., Spring Practice"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Event Type
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="practice">Practice</option>
                  <option value="game">Game</option>
                  <option value="tournament">Tournament</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date & Time
                </label>
                <input
                  type="datetime-local"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="e.g., Field A"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Add any additional details..."
                rows={3}
                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
              >
                {editingEvent ? 'Update Event' : 'Create Event'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingEvent(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Events List */}
      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading events...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No events scheduled yet</div>
      ) : (
        <div className="grid gap-4">
          {events.map(event => (
            <div
              key={event.id}
              className="p-6 bg-slate-800 border border-slate-700 rounded-lg hover:border-slate-600 transition"
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold text-white">{event.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${getEventTypeColor(event.type)}`}>
                      {event.type}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-400 space-y-1">
                    <p>📅 {formatDate(event.date)}</p>
                    <p>📍 {event.location}</p>
                  </div>
                </div>

                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(event)}
                      className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(event.id)}
                      className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded transition"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>

              {event.description && (
                <p className="text-gray-300 text-sm mt-3">{event.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default EventsView;
