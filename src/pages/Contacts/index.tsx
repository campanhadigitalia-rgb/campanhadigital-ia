import { Leaderboard } from '../../components/ui/Leaderboard';

export default function Contacts() {
  return (
    <div className="flex flex-col gap-6 w-full h-full">
      {/* CRM de Militância e Hall da Fama */}
      <section className="flex-1">
         <Leaderboard />
      </section>
    </div>
  );
}
