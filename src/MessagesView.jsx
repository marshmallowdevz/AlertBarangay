import { useState } from 'react';
import './Official.css';

export default function MessagesView({ conversations, onReply }) {
  const [activeConversationId, setActiveConversationId] = useState(conversations[0]?.id ?? '');
  const [reply, setReply] = useState('');
  const [formError, setFormError] = useState('');
  const activeConversation = conversations.find((conversation) => conversation.id === activeConversationId);

  const submitReply = (event) => {
    event.preventDefault();
    const body = reply.trim();
    if (!activeConversation || !body) {
      setFormError('Choose a conversation and enter a message.');
      return;
    }
    onReply(activeConversation.id, body);
    setReply('');
    setFormError('');
  };

  return (
    <section className="card">
      <div className="card-head"><div><h2>Messages</h2><p className="muted">Sample conversations for this dashboard preview.</p></div></div>
      {conversations.length === 0 ? <p className="empty">No sample conversations to show.</p> : (
        <div className="message-layout">
          <nav className="conversation-list" aria-label="Conversations">
            {conversations.map((conversation) => (
              <button type="button" key={conversation.id} className={`conversation-button ${activeConversationId === conversation.id ? 'active' : ''}`} onClick={() => setActiveConversationId(conversation.id)}>
                <strong>{conversation.residentName}</strong>
                <small>{conversation.messages.at(-1)?.body ?? 'No messages yet'}</small>
              </button>
            ))}
          </nav>
          <div className="message-thread">
            <h3>{activeConversation?.residentName}</h3>
            <div className="thread-history" aria-live="polite">
              {activeConversation?.messages.map((message) => (
                <article key={message.id} className={`message-bubble ${message.sender === 'Barangay Official' ? 'outgoing' : ''}`}>
                  <strong>{message.sender}</strong><p>{message.body}</p>
                  <small>{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(message.createdAt))}</small>
                </article>
              ))}
            </div>
            <form className="reply-form" onSubmit={submitReply}>
              <label>Reply<textarea rows="3" maxLength={1000} value={reply} onChange={(event) => setReply(event.target.value)} required /></label>
              {formError && <p className="form-error" role="alert">{formError}</p>}
              <button type="submit" className="btn btn-maroon">Send reply</button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
