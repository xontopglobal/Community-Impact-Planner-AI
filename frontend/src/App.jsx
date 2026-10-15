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
    name: 'SmartCare AI',
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
  const [complaintSuccess, setComplaintSuccess] = useState('');
  const [trackingReference, setTrackingReference] = useState('');
  const [trackingContact, setTrackingContact] = useState('');
  const [trackedComplaint, setTrackedComplaint] = useState(null);
  const [trackingError, setTrackingError] = useState('');
  const [isTrackingComplaint, setIsTrackingComplaint] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingComplaint, setIsSavingComplaint] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingFeedback, setRatingFeedback] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [ratingMessage, setRatingMessage] = useState('');
  const [ratings, setRatings] = useState([]);
  const [ratingSummary, setRatingSummary] = useState({
    total: 0,
    average: 0,
  });
  const [isLoadingRatings, setIsLoadingRatings] = useState(false);


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

  const handleTrackComplaint = async (event) => {
    event.preventDefault();

    const referenceId = trackingReference.trim();
    const customerContact = trackingContact.trim();

    if (!referenceId || !customerContact) {
      setTrackingError('Enter your complaint reference and contact details.');
      setTrackedComplaint(null);
      return;
    }

    setIsTrackingComplaint(true);
    setTrackingError('');
    setTrackedComplaint(null);

    try {
      const params = new URLSearchParams({
        referenceId,
        customerContact,
      });

      const response = await fetch(
        `${API_BASE_URL}/api/complaints/track?${params.toString()}`
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to check complaint status.');
      }

      setTrackedComplaint(data.complaint);
    } catch (error) {
      setTrackingError(error.message || 'Unable to check complaint status.');
    } finally {
      setIsTrackingComplaint(false);
    }
  };
  const fetchRatings = useCallback(async () => {
    setIsLoadingRatings(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ratings`);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to load ratings.');
      }

      setRatings(data.ratings || []);
      setRatingSummary(data.summary || { total: 0, average: 0 });
    } catch (error) {
      console.error('Error fetching ratings:', error);
    } finally {
      setIsLoadingRatings(false);
    }
  }, []);

  const handleRatingSubmit = async (event) => {
    event.preventDefault();

    if (rating < 1 || rating > 5) {
      setRatingMessage('Please select a star rating from 1 to 5.');
      return;
    }

    setIsSubmittingRating(true);
    setRatingMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/ratings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating,
          feedback: ratingFeedback,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || 'Unable to submit your rating.');
      }

      setRatingMessage('Thank you for rating our service!');
      setRating(0);
      setRatingFeedback('');
      await fetchRatings();
    } catch (error) {
      setRatingMessage(error.message || 'Unable to submit your rating. Please try again.');
    } finally {
      setIsSubmittingRating(false);
    }
  };

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
    setComplaintSuccess('');

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
      setComplaintSuccess(
        `Your complaint has been submitted successfully${data.referenceId ? `. Reference: ${data.referenceId}` : '.'
        }`
      );


      fetchComplaints().catch((error) => {
        console.error('Unable to refresh complaints:', error);
      });

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
    fetchRatings();
  }, [fetchBusiness, fetchRatings]);


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
          
            <div>
              <p className="panel-label">Customer view</p>
            </div>
          <div className="suggestions">
            {defaultSuggestions.map((suggestion) => (
              <button key={suggestion} type="button" onClick={() => setInput(suggestion)}>{suggestion}</button>
            ))}
          </div>
          <div className="chat-thread" aria-live="polite">
            {messages.map((message) => (
              <div key={message.id} className={`message ${message.sender}`}>
                <span>{message.sender === 'bot' ? 'SmartCare AI' : 'Customer'}</span>
                <p>{message.text}</p>
              </div>
            ))}
            {isLoading && <div className="message bot"><span>SmartCare AI</span><p>Thinking…</p></div>}
          </div>
          <form className="chat-form" onSubmit={(event) => { event.preventDefault(); handleQuestionSubmit(input); }}>
            <input type="text" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about a product or submit a complaint" aria-label="Ask SmartCare a question" />
            <button type="submit" disabled={isLoading}>{isLoading ? 'Sending…' : 'Send'}</button>
          </form>
          <section className="complaint-tracker">
            <h3>Track Your Complaint</h3>
            <p>Enter your complaint reference and the contact details you used when submitting it.</p>

            <form onSubmit={handleTrackComplaint}>
              <label>
                Complaint reference
                <input
                  type="text"
                  value={trackingReference}
                  onChange={(event) => setTrackingReference(event.target.value)}
                  placeholder="e.g. SC-20261015-XZWPF3"
                  required
                />
              </label>

              <label>
                Phone number or email
                <input
                  type="text"
                  value={trackingContact}
                  onChange={(event) => setTrackingContact(event.target.value)}
                  placeholder="Enter your complaint contact details"
                  required
                />
              </label>

              {trackingError && (
                <p className="error-text" role="alert">{trackingError}</p>
              )}

              <button type="submit" className="secondary-button" disabled={isTrackingComplaint}>
                {isTrackingComplaint ? 'Checking status…' : 'Track complaint'}
              </button>
            </form>

            {trackedComplaint && (
              <div className="complaint-status" role="status">
                <h4>Complaint Status</h4>
                <p>
                  Reference: <strong>{trackedComplaint.referenceId}</strong>
                </p>
                <p>
                  Status: <strong>{trackedComplaint.status}</strong>
                </p>
                {trackedComplaint.updatedAt && (
                  <p>
                    Last updated: {new Date(trackedComplaint.updatedAt).toLocaleString()}
                  </p>
                )}
              </div>
            )}
          </section>


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
            {complaintSuccess && <p className="success-text" role="status">{complaintSuccess}</p>}
            <button type="submit" className="secondary-button" disabled={isSavingComplaint}>{isSavingComplaint ? 'Saving…' : 'Record complaint'}</button>
          </form>

        </section>

        <section className="panel rating-panel">
          <div className="panel-header">
            <div>
              <p className="panel-label">Customer feedback</p>
              <h2>Rate Your SmartCare AI Experience</h2>
            </div>
          </div>

          <div className="rating-summary">
            <strong>
              {Number(ratingSummary.average || 0).toFixed(1)} / 5
            </strong>
            <span aria-label={`${ratingSummary.average} out of 5 stars`}>
              {'★'.repeat(Math.round(Number(ratingSummary.average || 0)))}
              {'☆'.repeat(5 - Math.round(Number(ratingSummary.average || 0)))}
            </span>
            <p>
              {isLoadingRatings
                ? 'Loading ratings…'
                : ratingSummary.total === 0
                  ? 'No customer ratings yet. Be the first to rate us!'
                  : `Based on ${ratingSummary.total} ${ratingSummary.total === 1 ? 'rating' : 'ratings'}`}
            </p>
          </div>

          <form className="rating-form" onSubmit={handleRatingSubmit}>
            <fieldset disabled={isSubmittingRating}>
              <legend>How would you rate your experience?</legend>

              <div className="star-selector">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={star <= rating ? 'star active' : 'star'}
                    onClick={() => {
                      setRating(star);
                      setRatingMessage('');
                    }}
                    aria-label={`${star} ${star === 1 ? 'star' : 'stars'}`}
                    aria-pressed={rating === star}
                  >
                    {star <= rating ? '★' : '☆'}
                  </button>
                ))}
              </div>
            </fieldset>

            <label htmlFor="rating-feedback">
              Optional feedback
            </label>
            <textarea
              id="rating-feedback"
              value={ratingFeedback}
              onChange={(event) => setRatingFeedback(event.target.value)}
              placeholder="Tell us what went well or what we can improve."
              rows={3}
              maxLength={1000}
              disabled={isSubmittingRating}
            />

            {ratingMessage && (
              <p role="status" className="rating-message">
                {ratingMessage}
              </p>
            )}

            <button
              type="submit"
              className="secondary-button"
              disabled={isSubmittingRating}
            >
              {isSubmittingRating ? 'Submitting…' : 'Submit Rating'}
            </button>
          </form>

          {ratings.some((item) => item.feedback) && (
            <div className="rating-reviews">
              <h3>Recent feedback</h3>
              {ratings
                .filter((item) => item.feedback)
                .slice(0, 3)
                .map((item) => (
                  <article key={item.id} className="rating-review">
                    <p className="review-stars" aria-label={`${item.rating} out of 5 stars`}>
                      {'★'.repeat(item.rating)}
                      {'☆'.repeat(5 - item.rating)}
                    </p>
                    <p>{item.feedback}</p>
                    <small>
                      {item.created_at
                        ? new Date(item.created_at).toLocaleDateString()
                        : ''}
                    </small>
                  </article>
                ))}
            </div>
          )}
        </section>

        <aside className="panel dashboard-panel">
        </aside>
      </main>
    </div>
  );
}

export default App;
