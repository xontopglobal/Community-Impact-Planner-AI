import { useEffect, useState } from 'react';
import './App.css';

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://community-impact-planner-ai.onrender.com';


const defaultSuggestions = [
  'Which product would you recommend for someone looking for a durable school backpack, and how much does it cost?',
  'I need a backpack under $60 that is good for school.',
  'I received a damaged backpack. Please record a complaint.',
];

const emptyComplaint = {
  customerName: '',
  customerContact: '',
  description: '',
};

function App() {
  const [business, setBusiness] = useState({ name: 'SmartCare Supply Co.' });
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi! I can help with product questions, recommendations, and complaint follow-up.',
    },
  ]);
  const [input, setInput] = useState('');
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaintId, setSelectedComplaintId] = useState('');
  const [complaintForm, setComplaintForm] = useState(emptyComplaint);
  const [complaintError, setComplaintError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchBusiness = async () => {
    const response = await fetch('https://community-impact-planner-ai.onrender.com');
    const data = await response.json();
    if (data.business) {
      setBusiness(data.business);
    }
  };

  const fetchComplaints = async () => {
    const response = await fetch('https://community-impact-planner-ai.onrender.com/api/complaints');
    const data = await response.json();
    if (data.complaints) {
      setComplaints(data.complaints);
      if (!selectedComplaintId && data.complaints.length > 0) {
        setSelectedComplaintId(data.complaints[0].referenceId);
      }
    }
  };

  useEffect(() => {
    fetchBusiness();
    fetchComplaints();
  }, []);

  const selectedComplaint = complaints.find(
    (complaint) => complaint.referenceId === selectedComplaintId,
  );

  const handleQuestionSubmit = async (messageText) => {
    const trimmed = messageText.trim();
    if (!trimmed) return;

    const userMessage = { id: Date.now(), sender: 'customer', text: trimmed };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('https://community-impact-planner-ai.onrender.com/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json();
      const replyText = data.reply || 'I am not sure how to answer that yet.';

      const botMessage = {
        id: Date.now() + 1,
        sender: 'bot',
        text: replyText,
      };

      setMessages((current) => [...current, botMessage]);

      if (data.type === 'complaint-prompt') {
        setComplaintForm((current) => ({ ...current, description: trimmed }));
      }
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 2,
          sender: 'bot',
          text: 'Sorry, I was unable to answer that right now. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplaintSubmit = async (event) => {
    event.preventDefault();
    if (!complaintForm.description.trim()) {
      setComplaintError('Please provide a complaint description before submitting.');
      return;
    }

    setComplaintError('');

    try {
      const response = await fetch(`${API_BASE_URL}https://community-impact-planner-ai.onrender.com/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: complaintForm.customerName,
          customerContact: complaintForm.customerContact,
          description: complaintForm.description,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        setComplaintError(data.error || 'Unable to record the complaint.');
        return;
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          sender: 'bot',
          text: `Your complaint has been recorded. Reference ID: ${data.referenceId}. It is now visible in the business dashboard and is currently marked as Open.`,
        },
      ]);
      setComplaintForm(emptyComplaint);
      await fetchComplaints();
    } catch (error) {
      setComplaintError('The complaint could not be saved. Please try again.');
    }
  };

  const handleStatusChange = async (complaintId, nextStatus) => {
    const response = await fetch(`${API_BASE_URL}https://community-impact-planner-ai.onrender.com/api/complaints/${complaintId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (response.ok) {
      await fetchComplaints();
    }
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">Customer support demo</span>
          <h1>{business.name}</h1>
        </div>
      </header>

      <main className="main-grid">
        <section className="panel customer-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Customer view</p>
              <h2>SmartCare AI</h2>
            </div>
          </div>

          <div className="welcome-box">
            <p>{business.welcome}</p>
          </div>

          <div className="suggestions">
            {defaultSuggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setInput(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>

          <div className="chat-thread">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <span>{message.sender === 'bot' ? 'SmartCare' : 'Customer'}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {isLoading && <div className="message bot"><span>SmartCare</span><p>Thinking…</p></div>}
          </div>

          <form
            className="chat-form"
            onSubmit={(event) => {
              event.preventDefault();
              handleQuestionSubmit(input);
            }}
          >
            <input
              type="text"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about a product or submit a complaint"
            />
            <button type="submit" disabled={isLoading}>
              Send
            </button>
          </form>

          <form className="complaint-form" onSubmit={handleComplaintSubmit}>
            <h3>Record a complaint</h3>
            <label>
              Customer name
              <input
                type="text"
                value={complaintForm.customerName}
                onChange={(event) =>
                  setComplaintForm((current) => ({ ...current, customerName: event.target.value }))
                }
              />
            </label>
            <label>
              Contact details
              <input
                type="text"
                value={complaintForm.customerContact}
                onChange={(event) =>
                  setComplaintForm((current) => ({ ...current, customerContact: event.target.value }))
                }
              />
            </label>
            <label>
              Complaint description
              <textarea
                value={complaintForm.description}
                onChange={(event) =>
                  setComplaintForm((current) => ({ ...current, description: event.target.value }))
                }
                rows="4"
                placeholder="I received a damaged backpack."
              />
            </label>
            {complaintError && <p className="error-text">{complaintError}</p>}
            <button type="submit" className="secondary-button">
              Record complaint
            </button>
          </form>
        </section>

        <aside className="panel dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Owner dashboard</p>
              <h2>Customer follow-up</h2>
            </div>
          </div>

          <div className="dashboard-list">
            {complaints.length === 0 ? (
              <p className="empty-state">No complaints yet.</p>
            ) : (
              complaints.map((complaint) => (
                <button
                  key={complaint.referenceId}
                  type="button"
                  className={`complaint-card ${selectedComplaint?.referenceId === complaint.referenceId ? 'selected' : ''}`}
                  onClick={() => setSelectedComplaintId(complaint.referenceId)}
                >
                  <div className="complaint-card-header">
                    <strong>{complaint.referenceId}</strong>
                    <span className={`status-badge status-${complaint.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {complaint.status}
                    </span>
                  </div>
                  <p>{complaint.description}</p>
                  <small>{new Date(complaint.createdAt).toLocaleDateString()}</small>
                </button>
              ))
            )}
          </div>

          {selectedComplaint && (
            <div className="complaint-detail">
              <div className="detail-header">
                <h3>{selectedComplaint.referenceId}</h3>
                <span className={`status-badge status-${selectedComplaint.status.toLowerCase().replace(/\s+/g, '-')}`}>
                  {selectedComplaint.status}
                </span>
              </div>

              <p>
                <strong>Name:</strong> {selectedComplaint.customerName || 'Anonymous'}
              </p>
              <p>
                <strong>Contact:</strong> {selectedComplaint.customerContact || 'Not provided'}
              </p>
              <p>
                <strong>Date:</strong> {new Date(selectedComplaint.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Issue:</strong> {selectedComplaint.description}
              </p>

              <label>
                Update status
                <select
                  value={selectedComplaint.status}
                  onChange={(event) => handleStatusChange(selectedComplaint.id, event.target.value)}
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </label>
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;
