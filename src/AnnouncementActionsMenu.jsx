import { useState } from 'react';

export default function AnnouncementActionsMenu({ announcement, onEdit, onDelete, onArchive, busy }) {
  const [isOpen, setIsOpen] = useState(false);
  const runAction = (callback) => {
    setIsOpen(false);
    callback(announcement);
  };

  return (
    <div className="announcement-menu-wrap">
      <button type="button" className="announcement-menu-trigger" aria-label={`Actions for ${announcement.title}`} aria-haspopup="menu" aria-expanded={isOpen} onClick={() => setIsOpen((open) => !open)}>
        <span aria-hidden="true">•••</span>
      </button>
      {isOpen && <div className="announcement-menu" role="menu">
        <button type="button" role="menuitem" onClick={() => runAction(onEdit)}>Edit</button>
        <button type="button" role="menuitem" disabled={busy} onClick={() => runAction(onArchive)}>{announcement.is_archived ? 'Restore' : 'Archive'}</button>
        <button type="button" role="menuitem" className="danger" disabled={busy} onClick={() => runAction(onDelete)}>Delete</button>
      </div>}
    </div>
  );
}
