/* ===== PART 1 (Menula De Pinto) · POP-UP WINDOW. Any part of the site calls openInfo('Contact') (or FAQ, Policies, Privacy Notice)
   to show that text in a pop-up. Clicking outside it, the close button or Escape hides it again. ===== */
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import Icon from './Icon.jsx';

const infoBodies = {
  About: 'Void connects fans with live experiences across Sri Lanka.',
  Contact: 'Contact the organizer at events.intothevoid@gmail.com. Support hours: Monday to Friday, 09:00 to 17:00, Asia/Colombo.',
  Policies: [
    'Terms: valid ID is required for age-restricted events. Tickets admit the named guest or party. A booking is confirmed after full payment. This prototype does not process real payments.',
    'Refunds: request one from My Tickets. The organizer reviews eligibility. If a split-pay reservation expires unpaid, paid shares are returned and inventory is released.',
  ],
  'Privacy Notice': [
    'What we collect: if you join the list or pre-register, we store your email address. If you book, we store your name, phone number and order details. We never store card numbers.',
    'Why: to send event updates you asked for, issue your tickets, and contact you about a booking. We do not sell your data or share it with advertisers.',
    'Your choices: every email has an unsubscribe link, and you can ask us to see or delete your data at events.intothevoid@gmail.com. This is a prototype, and in this demo nothing you enter leaves your browser.',
  ],
  FAQ: 'Where is my ticket? Open My Tickets. Can I split payment? Yes, each friend receives their own link. What if someone does not pay? The 48-hour reservation expires. Can I explore the venue? Use the venue preview.',
};

const InfoContext = createContext(() => {});
export const useInfo = () => useContext(InfoContext);

/* A button that opens one of the pop-ups, e.g. <InfoButton topic="FAQ">FAQ</InfoButton>. */
export function InfoButton({ topic, children }) {
  const openInfo = useInfo();
  return <button type="button" onClick={() => openInfo(topic)}>{children}</button>;
}

export function InfoProvider({ children }) {
  const dialog = useRef(null);
  const [topic, setTopic] = useState('');

  const openInfo = useCallback((name) => {
    setTopic(name);
    if (!dialog.current.open) dialog.current.showModal();
    document.documentElement.style.overflow = 'hidden';
  }, []);
  /* Unlock the page straight away; the dialog's own close event (which also covers Escape) can arrive later, while it fades out. */
  const unlock = () => { document.documentElement.style.overflow = ''; };
  const close = () => { dialog.current.close(); unlock(); };

  const body = infoBodies[topic];
  return (
    <InfoContext.Provider value={openInfo}>
      {children}
      <dialog
        className="sheet"
        id="modal"
        aria-labelledby="modalTitle"
        ref={dialog}
        onClick={(e) => { if (e.target === dialog.current) close(); }}
        onClose={() => { if (!dialog.current.open) unlock(); }} /* a late close event from the previous pop-up must not unlock a new one */
      >
        <button className="icon-btn sheet-close" type="button" aria-label="Close" onClick={close}><Icon name="close" /></button>
        <div className="sheet-body">
          <h2 id="modalTitle">{topic}</h2>
          <div id="modalBody">
            {body && (Array.isArray(body) ? body : [body]).map((t) => <p className="muted-p" key={t}>{t}</p>)}
          </div>
          <div className="modal-actions" id="modalActions" />
        </div>
      </dialog>
    </InfoContext.Provider>
  );
}
