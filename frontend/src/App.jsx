import { useCallback, useEffect, useState } from 'react';
import './App.css';

const API_BASE_URL = (
  import.meta.env.VITE_API_URL ||
  'https://community-impact-planner-ai.onrender.com'
).replace(/\/+$/, '');

const defaultSuggestions = [
  'Which product would you recommend for someone looking for a durable school backpack, and how much does it cost?',
  'I need a backpack under $60 that is good for school.',
  'I received a damaged backpack. Please record a complaint.',
];

const emptyComplaint = { customerName: '', customerContact: '', description: '' };

function App() {
  const [business, setBusiness] = useState({
    name: 'SmartCare Supply Co.',
    welcome: 'Explore our products, discover recommendations, and get customer support.',
  });
  const [messages, setMessages] = useState([{
    id: 1,
    sender: 'bot',
    text: 'Hi! I can help with product questions, recommendations, and complaint follow-up.',
  }]);
  const [input, setInput] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [complaintForm, setComplaintForm] = useState(emptyComplaint);
  const [complaintError, setComplaintError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingComplaint, setIsSavingComplaint] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchBusiness = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/business`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Unable to load business information.');
      if (data.business) setBusiness((current) => ({ ...current, ...data.business }));
    } catch (error) {
      console.error('Error fetching business:', error);
    }
  }, []);


  const fetchComplaints = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/complaints?_=${Date.now()}`,
        {
          method: 'GET',
          cache: 'no-store',
          headers: { Accept: 'application/json' },
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load complaints.');
      }

      const list = Array.isArray(data.complaints)
        ? data.complaints
        : [];

      setComplaints(list);

      setSelectedComplaintId((currentId) =>
        list.some((item) => item.referenceId === currentId)
          ? currentId
          : list[0]?.referenceId || ''
      );

      setComplaintError('');
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaintError(
        error.message || 'Unable to refresh complaints.'
      );
    }
  }, []);

  const handleComplaintSubmit = async (event) => {
    event.preventDefault();

    if (!complaintForm.description.trim()) {
      setComplaintError('Please enter a complaint description.');
      return;
    }

    setIsSavingComplaint(true);
    setComplaintError('');

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/complaints`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            customerName: complaintForm.customerName,
            customerContact: complaintForm.customerContact,
            description: complaintForm.description,
          }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to save complaint.');
      }

      setComplaintForm(emptyComplaint);
      setComplaintError('');

      await fetchComplaints();
    } catch (error) {
      console.error('Error saving complaint:', error);
      setComplaintError(
        error.message || 'Unable to save complaint.'
      );
    } finally {
      setIsSavingComplaint(false);
    }
  };


  useEffect(() => {
    fetchBusiness();
  }, [fetchBusiness]);

  const selectedComplaint = complaints.find(
    (complaint) => complaint.referenceId === selectedComplaintId
  );

  const handleQuestionSubmit = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed || isLoading) return;

    setMessages((current) => [
      ...current,
      { id: Date.now(), sender: 'customer', text: trimmed },
    ]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Unable to answer your question.');
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          sender: 'bot',
          text: data.reply || 'I am not sure how to answer that yet.',
        },
      ]);

      if (data.type === 'complaint-prompt') {
        setComplaintForm((current) => ({
          ...current,
          description: trimmed,
        }));
      }
    } catch (error) {
      console.error('Chat request failed:', error);
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 2,
          sender: 'bot',
          text: error.message || 'Sorry, I was unable to answer that right now. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Customer support demo</span>
          <h1>{business.name}</h1>
          <p>{business.welcome}</p>
        </div>
      </header>
      <main className="main-grid">
        <section className="panel customer-panel">
          <div className="panel-header">
            <div><p className="panel-label">Customer view</p><h2>SmartCare AI</h2></div>
          </div>
          <div className="suggestions">
            {defaultSuggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setInput(suggestion)}>{suggestion}</button>
            ))}
          </div>
          <div className="chat-thread" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <span>{message.sender === 'bot' ? 'SmartCare' : 'Customer'}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {isLoading && <div className="message bot"><span>SmartCare</span><p>Thinking…</p></div>}
          </div>
          <form className="chat-form" onSubmit={(event) => { event.preventDefault(); handleQuestionSubmit(input); }}>
            <input type="text" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about a product or submit a complaint" aria-label="Ask SmartCare a question" />
            <button type="submit" disabled={isLoading}>{isLoading ? 'Sending…' : 'Send'}</button>
          </form>
          <form className="complaint-form" onSubmit={handleComplaintSubmit}>
            <h3>Record a complaint</h3>
            <label>Customer name
              <input type="text" value={complaintForm.customerName} onChange={(event) => setComplaintForm((current) => ({ ...current, customerName: event.target.value }))} placeholder="Enter your name" />
            </label>
            <label>Contact details
              <input type="text" value={complaintForm.customerContact} onChange={(event) => setComplaintForm((current) => ({ ...current, customerContact: event.target.value }))} placeholder="Phone number or email" />
            </label>
            <label>Complaint description
              <textarea value={complaintForm.description} onChange={(event) => setComplaintForm((current) => ({ ...current, description: event.target.value }))} rows={4} placeholder="Describe the problem you experienced." required />
            </label>
            {complaintError && <p className="error-text" role="alert">{complaintError}</p>}
            <button type="submit" className="secondary-button" disabled={isSavingComplaint}>{isSavingComplaint ? 'Saving…' : 'Record complaint'}</button>
          </form>
        </section>
        <aside className="panel dashboard-panel">
          <div className="panel-header">
            <div><p className="panel-label">Owner dashboard</p><h2>Customer follow-up</h2></div>
            <button type="button" onClick={fetchComplaints} disabled={isUpdatingStatus}>Refresh</button>
          </div>
          <div className="dashboard-list">
            {complaints.length === 0 ? <p className="empty-state">No complaints yet.</p> : complaints.map((complaint) => (
              <button key={complaint.referenceId} type="button" className={`complaint-card ${selectedComplaintId === complaint.referenceId ? 'selected' : ''}`} onClick={() => setSelectedComplaintId(complaint.referenceId)}>
                <div className="complaint-card-header">
                  <strong>{complaint.referenceId}</strong>
                  <span className={`status-badge status-${String(complaint.status || 'Open').toLowerCase().replace(/\s+/g, '-')}`}>{complaint.status || 'Open'}</span>
                </div>
                <p>{complaint.description}</p>
                <small>{complaint.createdAt ? new Date(complaint.createdAt).toLocaleDateString() : ''}</small>
              </button>
            ))}
          </div>
          {selectedComplaint && (
            <div className="complaint-detail">
              <div className="detail-header">
                <h3>{selectedComplaint.referenceId}</h3>
                <span className={`status-badge status-${String(selectedComplaint.status || 'Open').toLowerCase().replace(/\s+/g, '-')}`}>{selectedComplaint.status || 'Open'}</span>
              </div>
              <p><strong>Name:</strong> {selectedComplaint.customerName || 'Anonymous'}</p>
              <p><strong>Contact:</strong> {selectedComplaint.customerContact || 'Not provided'}</p>
              <p><strong>Date:</strong> {selectedComplaint.createdAt ? new Date(selectedComplaint.createdAt).toLocaleString() : 'Not available'}</p>
              <p><strong>Issue:</strong> {selectedComplaint.description}</p>
              <label>Update status
                <select value={selectedComplaint.status || 'Open'} disabled={isUpdatingStatus} onChange={(event) => handleStatusChange(selectedComplaint.id, event.target.value)}>
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </label>
              {complaintError && <p className="error-text" role="alert">{complaintError}</p>}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
