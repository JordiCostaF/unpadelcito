
import React from 'react';
import type { CategoryFixture, PlayoffMatch } from '@/app/active-tournament/page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trophy, ChevronRight } from 'lucide-react';

interface ShareablePlayoffsProps {
  tournamentName: string;
  categoryFixture: CategoryFixture | null;
}

const MatchBox = ({ match, title, winner }: { match?: PlayoffMatch; title: string; winner?: boolean }) => {
  const dupla1Name = match?.dupla1?.nombre || 'Por definir';
  const dupla2Name = match?.dupla2?.nombre || 'Por definir';
  const score1 = match?.score1 ?? '-';
  const score2 = match?.score2 ?? '-';
  const isCompleted = match?.status === 'completed';

  const winnerId = match?.winnerId;
  const d1IsWinner = isCompleted && winnerId === match?.dupla1?.id;
  const d2IsWinner = isCompleted && winnerId === match?.dupla2?.id;

  return (
    <div className="flex flex-col items-center w-full">
      <h4 className="text-lg font-semibold text-primary mb-2">{title}</h4>
      <div className={`p-3 border rounded-md w-72 bg-background text-sm ${winner ? 'border-primary border-2 shadow-lg shadow-primary/20' : ''}`}>
        <div className={`flex justify-between items-center ${d1IsWinner ? 'font-bold' : ''}`}>
          <span>{dupla1Name}</span>
          <span>{score1}</span>
        </div>
        <Separator className="my-1 bg-border/50" />
        <div className={`flex justify-between items-center ${d2IsWinner ? 'font-bold' : ''}`}>
          <span>{dupla2Name}</span>
          <span>{score2}</span>
        </div>
      </div>
    </div>
  );
};

export const ShareablePlayoffs = React.forwardRef<HTMLDivElement, ShareablePlayoffsProps>(
  ({ tournamentName, categoryFixture }, ref) => {
    if (!categoryFixture || !categoryFixture.playoffMatches) {
      return null;
    }

    const containerStyle: React.CSSProperties = {
      width: '1200px',
      fontFamily: "'PT Sans', sans-serif",
      backgroundColor: '#0A0A0A',
      color: '#FFFFFF',
      padding: '2rem',
    };

    const semifinals = categoryFixture.playoffMatches.filter(m => m.stage === 'semifinal');
    const final = categoryFixture.playoffMatches.find(m => m.stage === 'final');
    const thirdPlace = categoryFixture.playoffMatches.find(m => m.stage === 'tercer_puesto');
    
    const sf1 = semifinals.find(m => m.id.includes('SF1'));
    const sf2 = semifinals.find(m => m.id.includes('SF2'));
    const champion = final?.status === 'completed' ? (final.winnerId === final.dupla1.id ? final.dupla1.nombre : final.dupla2.nombre) : null;

    return (
      <div ref={ref} style={containerStyle}>
        <Card className="border-2 border-primary shadow-2xl bg-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-4xl font-bold text-primary">{tournamentName}</CardTitle>
            <p className="text-2xl text-muted-foreground pt-2">{categoryFixture.categoryName} - Fase Final</p>
          </CardHeader>
          <CardContent className="pt-6 flex flex-col items-center justify-center space-y-12">

            {/* Main Bracket */}
            <div className="flex items-center justify-center w-full space-x-8">
              {/* Semifinals Column */}
              <div className="flex flex-col justify-around h-[20rem] space-y-16">
                <MatchBox match={sf1} title="Semifinal 1" />
                <MatchBox match={sf2} title="Semifinal 2" />
              </div>

              <div className="h-full flex items-center">
                 <ChevronRight className="h-12 w-12 text-primary/50" />
              </div>
              
              <MatchBox match={final} title="Final" winner={!!champion} />
            </div>
            
            {champion && (
                <div className="text-center py-4">
                    <h3 className="text-2xl font-bold uppercase tracking-widest text-primary">CAMPEÓN</h3>
                    <p className="text-4xl font-bold flex items-center justify-center mt-2">
                        <Trophy className="h-10 w-10 mr-4 text-primary" />
                        {champion}
                        <Trophy className="h-10 w-10 ml-4 text-primary" />
                    </p>
                </div>
            )}

            {/* Third Place Match */}
            {thirdPlace && (
              <div className="pt-8 mt-8 border-t-2 border-dashed border-primary/50 w-full flex justify-center">
                <MatchBox match={thirdPlace} title="Tercer Puesto" />
              </div>
            )}

          </CardContent>
        </Card>
      </div>
    );
  }
);

ShareablePlayoffs.displayName = 'ShareablePlayoffs';
