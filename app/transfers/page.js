import { permanentRedirect } from 'next/navigation';

// Transfers now live at the bottom of the Players page.
export default function TransfersPage() {
  permanentRedirect('/players#transfers');
}
