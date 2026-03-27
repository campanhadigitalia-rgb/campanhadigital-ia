import { AuthProvider } from './context/AuthContext';
import { CampaignProvider } from './context/CampaignContext';
import App from './App';
import PublicEvent from './pages/PublicEvent';

export const AppRoot = () => {
  const pathname = window.location.pathname;
  if (pathname.startsWith('/e/')) {
    const parts = pathname.split('/');
    if (parts.length >= 4) {
      return <PublicEvent campaignId={parts[2]} eventId={parts[3]} />;
    }
  }
  return (
    <AuthProvider>
      <CampaignProvider>
        <App />
      </CampaignProvider>
    </AuthProvider>
  );
};
