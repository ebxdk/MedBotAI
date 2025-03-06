import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import axios from 'axios';
import { motion } from 'framer-motion';
import React, { useEffect, useRef, useState } from 'react';
import { FaCalendarAlt, FaMagic, FaPlus, FaSave, FaTimes, FaTrash } from 'react-icons/fa';

const StudyCalendarPage = () => {
  const calendarRef = useRef(null);
  const [topics, setTopics] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [studyHoursPerDay, setStudyHoursPerDay] = useState(2);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [events, setEvents] = useState([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start: '',
    end: '',
    notes: '',
    completed: false
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await axios.get('/calendar/events');
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setError('Failed to load study events. Please try again.');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!topics.trim()) {
      setError('Please enter at least one topic');
      return;
    }
    
    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await axios.post('/calendar/generate', {
        topics: topics.split(',').map(topic => topic.trim()),
        start_date: startDate,
        end_date: endDate,
        study_hours_per_day: studyHoursPerDay
      });
      
      setEvents(response.data.events);
      
      // Reset form
      setTopics('');
      setStartDate('');
      setEndDate('');
      setStudyHoursPerDay(2);
    } catch (error) {
      console.error('Error generating study plan:', error);
      setError('Error generating study plan. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateClick = (info) => {
    const today = new Date();
    const clickedDate = new Date(info.dateStr);
    
    // Don't allow creating events in the past
    if (clickedDate < today && clickedDate.toDateString() !== today.toDateString()) {
      return;
    }
    
    setNewEvent({
      title: '',
      start: info.dateStr,
      end: info.dateStr,
      notes: '',
      completed: false
    });
    setEditMode(false);
    setSelectedEvent(null);
    setShowEventModal(true);
  };

  const handleEventClick = (info) => {
    const event = events.find(e => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setNewEvent({
        id: event.id,
        title: event.title,
        start: event.start.split('T')[0],
        end: event.end ? event.end.split('T')[0] : event.start.split('T')[0],
        notes: event.notes || '',
        completed: event.completed || false
      });
      setEditMode(true);
      setShowEventModal(true);
    }
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title.trim()) {
      return;
    }
    
    try {
      if (editMode && selectedEvent) {
        // Update existing event
        await axios.put(`/calendar/events/${selectedEvent.id}`, newEvent);
      } else {
        // Create new event
        await axios.post('/calendar/events', newEvent);
      }
      
      await fetchEvents();
      setShowEventModal(false);
    } catch (error) {
      console.error('Error saving event:', error);
      setError('Failed to save event. Please try again.');
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;
    
    try {
      await axios.delete(`/calendar/events/${selectedEvent.id}`);
      await fetchEvents();
      setShowEventModal(false);
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event. Please try again.');
    }
  };

  const handleToggleComplete = async (eventId, completed) => {
    try {
      await axios.patch(`/calendar/events/${eventId}`, { completed: !completed });
      await fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      setError('Failed to update event. Please try again.');
    }
  };

  const getEventClassNames = (eventInfo) => {
    const classes = ['p-1', 'rounded'];
    
    if (eventInfo.event.extendedProps.completed) {
      classes.push('bg-green-500/20', 'border-green-500', 'text-green-700');
    } else {
      classes.push('bg-primary/20', 'border-primary', 'text-primary-foreground');
    }
    
    return classes;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <FaCalendarAlt className="text-primary" />
          AI Study Planner
        </h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        <div className="lg:col-span-1">
          <div className="card p-6">
            <h2 className="text-xl font-bold mb-4">Generate Study Plan</h2>
            
            {error && (
              <div className="bg-destructive/15 text-destructive px-4 py-3 rounded-md mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="topics">
                  Medical Topics
                </label>
                <input
                  type="text"
                  id="topics"
                  value={topics}
                  onChange={(e) => setTopics(e.target.value)}
                  placeholder="Enter topics separated by commas (e.g., Cardiology, Neurology)"
                  className="input"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Separate multiple topics with commas
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="startDate">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="input"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="endDate">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="input"
                    min={startDate || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="studyHoursPerDay">
                  Study Hours Per Day
                </label>
                <select
                  id="studyHoursPerDay"
                  value={studyHoursPerDay}
                  onChange={(e) => setStudyHoursPerDay(Number(e.target.value))}
                  className="input"
                >
                  <option value={1}>1 Hour</option>
                  <option value={2}>2 Hours</option>
                  <option value={3}>3 Hours</option>
                  <option value={4}>4 Hours</option>
                  <option value={5}>5 Hours</option>
                  <option value={6}>6 Hours</option>
                </select>
              </div>
              
              <button
                type="submit"
                className="btn btn-primary w-full flex items-center justify-center gap-2"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <FaMagic />
                    Generate Study Plan
                  </>
                )}
              </button>
            </form>
            
            <div className="mt-6">
              <h3 className="text-lg font-bold mb-2">Tips</h3>
              <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
                <li>Click on a date to add a custom study session</li>
                <li>Click on an event to edit or mark it as completed</li>
                <li>Generate a plan for multiple topics to balance your study</li>
                <li>Adjust study hours based on your availability</li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-2 card p-6 overflow-hidden">
          <div className="h-full">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek'
              }}
              events={events.map(event => ({
                id: event.id,
                title: event.title,
                start: event.start,
                end: event.end,
                extendedProps: {
                  notes: event.notes,
                  completed: event.completed
                }
              }))}
              eventClassNames={getEventClassNames}
              dateClick={handleDateClick}
              eventClick={handleEventClick}
              height="100%"
              dayMaxEvents={3}
            />
          </div>
        </div>
      </div>
      
      {/* Event Modal */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div 
            className="bg-card rounded-lg shadow-lg w-full max-w-md mx-4"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-bold">
                {editMode ? 'Edit Study Session' : 'Add Study Session'}
              </h3>
              <button 
                onClick={() => setShowEventModal(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <FaTimes />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="eventTitle">
                  Title
                </label>
                <input
                  type="text"
                  id="eventTitle"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Study session title"
                  className="input"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="eventStart">
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="eventStart"
                    value={newEvent.start}
                    onChange={(e) => setNewEvent({...newEvent, start: e.target.value})}
                    className="input"
                    min={new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="eventEnd">
                    End Date
                  </label>
                  <input
                    type="date"
                    id="eventEnd"
                    value={newEvent.end}
                    onChange={(e) => setNewEvent({...newEvent, end: e.target.value})}
                    className="input"
                    min={newEvent.start || new Date().toISOString().split('T')[0]}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="eventNotes">
                  Notes
                </label>
                <textarea
                  id="eventNotes"
                  value={newEvent.notes}
                  onChange={(e) => setNewEvent({...newEvent, notes: e.target.value})}
                  placeholder="Add notes or details about this study session"
                  className="input min-h-[100px]"
                />
              </div>
              
              {editMode && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="eventCompleted"
                    checked={newEvent.completed}
                    onChange={(e) => setNewEvent({...newEvent, completed: e.target.checked})}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="eventCompleted" className="text-sm font-medium">
                    Mark as completed
                  </label>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t flex justify-between">
              {editMode ? (
                <>
                  <button
                    onClick={handleDeleteEvent}
                    className="btn btn-destructive flex items-center gap-2"
                  >
                    <FaTrash />
                    Delete
                  </button>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowEventModal(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEvent}
                      className="btn btn-primary flex items-center gap-2"
                    >
                      <FaSave />
                      Save
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowEventModal(false)}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEvent}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    <FaPlus />
                    Add Event
                  </button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default StudyCalendarPage; 