
import { useEffect, useState } from 'react';
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

const emptyComplaint = {
  customerName: '',
  customerContact: '',
  description: '',
};

function App() {
  const [business, setBusiness] = useState({
    name: 'SmartCare Supply Co.',
    welcome:
      'Explore our products, discover recommendations, and get customer support.',
  });

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
  const [isSavingComplaint, setIsSavingComplaint] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Load business information.
  const fetchBusiness = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/business`);

      if (!response.ok) {
        throw new Error('Unable to load business information.');
      }

      const data = await response.json();

      if (data.business) {
        setBusiness((current) => ({
          ...current,
          ...data.business,
        }));
      }
    } catch (error) {
      console.error('Error fetching business:', error);
    }
  };

  // Load complaints for the owner dashboard.
  const fetchComplaints = async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/complaints`,
        { cache: 'no-store' }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to load complaints.'
        );
      }

      const list = Array.isArray(data.complaints)
        ? data.complaints
        : [];

      setComplaints(list);

      setSelectedComplaintId((currentId) => {
        const stillExists = list.some(
          (complaint) => complaint.referenceId === currentId
        );

        if (stillExists) return currentId;

        return list.length > 0 ? list[0].referenceId : '';
      });

      console.log('Complaints refreshed:', list.length);
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaintError(
        error.message || 'Unable to refresh complaints.'
      );
    }
  };


  // Load initial information and complaints.
  useEffect(() => {
    fetchBusiness();
    fetchComplaints();
  }, []);

  // Find the currently selected complaint.
  const selectedComplaint = complaints.find(
    (complaint) => complaint.referenceId === selectedComplaintId
  );

  // Send a question to SmartCare AI.
  const handleQuestionSubmit = async (messageText) => {
    const trimmed = messageText.trim();

    if (!trimmed || isLoading) return;

    setMessages((current) => [
      ...current,
      {
        id: Date.now(),
        sender: 'customer',
        text: trimmed,
      },
    ]);

    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await response.json();

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
          text:
            error.message ||
            'Sorry, I was unable to answer that right now. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit a new customer complaint.
  const handleComplaintSubmit = async (event) => {
    event.preventDefault();

    if (!complaintForm.description.trim()) {
      setComplaintError(
        'Please provide a complaint description before submitting.'
      );
      return;
    }

    setComplaintError('');
    setIsSavingComplaint(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/complaints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: complaintForm.customerName,
          customerContact: complaintForm.customerContact,
          description: complaintForm.description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Unable to record the complaint.');
      }

      setMessages((current) => [
        ...current,
        {
          id: Date.now(),
          sender: 'bot',
          text: `Your complaint has been recorded successfully. Reference ID: ${data.referenceId}. Its status is Open.`,
        },
      ]);

      setComplaintForm(emptyComplaint);
      await fetchComplaints();
    } catch (error) {
      console.error('Complaint submission failed:', error);

      setComplaintError(
        error.message || 'The complaint could not be saved. Please try again.'
      );
    } finally {
      setIsSavingComplaint(false);
    }
  };

  // Update an existing complaint's status.
  const handleStatusChange = async (complaintId, nextStatus) => {
    if (!complaintId || isUpdatingStatus) return;

    setComplaintError('');
    setIsUpdatingStatus(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/complaints/${complaintId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: nextStatus }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || 'Unable to update complaint status.'
        );
      }

      await fetchComplaints();
    } catch (error) {
      console.error('Status update failed:', error);

      setComplaintError(
        error.message || 'Unable to update complaint status.'
      );
    } finally {
      setIsUpdatingStatus(false);
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

      

          <div className="suggestions">
            {defaultSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setInput(suggestion)}
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="chat-thread" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.sender}`}
              >
                <span>
                  {message.sender === 'bot' ? 'SmartCare' : 'Customer'}
                </span>
                <p>{message.text}</p>
              </div>
            ))}

            {isLoading && (
              <div className="message bot">
                <span>SmartCare</span>
                <p>Thinking…</p>
              </div>
            )}
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
              aria-label="Ask SmartCare a question"
            />

            <button type="submit" disabled={isLoading}>
              {isLoading ? 'Sending…' : 'Send'}
            </button>
          </form>

          <form
            className="complaint-form"
            onSubmit={handleComplaintSubmit}
          >
            <h3>Record a complaint</h3>

            <label>
              Customer name
              <input
                type="text"
                value={complaintForm.customerName}
                onChange={(event) =>
                  setComplaintForm((current) => ({
                    ...current,
                    customerName: event.target.value,
                  }))
                }
                placeholder="Enter your name"
              />
            </label>

            <label>
              Contact details
              <input
                type="text"
                value={complaintForm.customerContact}
                onChange={(event) =>
                  setComplaintForm((current) => ({
                    ...current,
                    customerContact: event.target.value,
                  }))
                }
                placeholder="Phone number or email"
              />
            </label>

            <label>
              Complaint description
              <textarea
                value={complaintForm.description}
                onChange={(event) =>
                  setComplaintForm((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={4}
                placeholder="Describe the problem you experienced."
                required
              />
            </label>

            {complaintError && (
              <p className="error-text" role="alert">
                {complaintError}
              </p>
            )}

            <button
              type="submit"
              className="secondary-button"
              disabled={isSavingComplaint}
            >
              {isSavingComplaint ? 'Saving…' : 'Record complaint'}
            </button>
          </form>
        </section>

        <aside className="panel dashboard-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Owner dashboard</p>
              <h2>Customer follow-up</h2>
            </div>

            <button
              type="button"
              onClick={fetchComplaints}
              disabled={isUpdatingStatus}
            >
              Refresh
            </button>
          </div>

          <div className="dashboard-list">
            {complaints.length === 0 ? (
              <p className="empty-state">No complaints yet.</p>
            ) : (
              complaints.map((complaint) => (
                <button
                  key={complaint.referenceId}
                  type="button"
                  className={`complaint-card ${selectedComplaintId === complaint.referenceId
                      ? 'selected'
                      : ''
                    }`}
                  onClick={() =>
                    setSelectedComplaintId(complaint.referenceId)
                  }
                >
                  <div className="complaint-card-header">
                    <strong>{complaint.referenceId}</strong>

                    <span
                      className={`status-badge status-${complaint.status
                        .toLowerCase()
                        .replace(/\s+/g, '-')}`}
                    >
                      {complaint.status}
                    </span>
                  </div>

                  <p>{complaint.description}</p>

                  <small>
                    {new Date(complaint.createdAt).toLocaleDateString()}
                  </small>
                </button>
              ))
            )}
          </div>

          {selectedComplaint && (
            <div className="complaint-detail">
              <div className="detail-header">
                <h3>{selectedComplaint.referenceId}</h3>

                <span
                  className={`status-badge status-${selectedComplaint.status
                    .toLowerCase()
                    .replace(/\s+/g, '-')}`}
                >
                  {selectedComplaint.status}
                </span>
              </div>

              <p>
                <strong>Name:</strong>{' '}
                {selectedComplaint.customerName || 'Anonymous'}
              </p>

              <p>
                <strong>Contact:</strong>{' '}
                {selectedComplaint.customerContact || 'Not provided'}
              </p>

              <p>
                <strong>Date:</strong>{' '}
                {new Date(selectedComplaint.createdAt).toLocaleString()}
              </p>

              <p>
                <strong>Issue:</strong> {selectedComplaint.description}
              </p>

              <label>
                Update status
                <select
                  value={selectedComplaint.status}
                  disabled={isUpdatingStatus}
                  onChange={(event) =>
                    handleStatusChange(
                      selectedComplaint.id,
                      event.target.value
                    )
                  }
                >
                  <option value="Open">Open</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                </select>
              </label>

              {complaintError && (
                <p className="error-text" role="alert">
                  {complaintError}
                </p>
              )}
            </div>
          )}
        </aside>
      </main>
    </div>
  );
}

export default App;