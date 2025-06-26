
import React from 'react';
import type { CategoryFixture } from '@/app/active-tournament/page';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface ShareableFixtureProps {
  tournamentName: string;
  categoryFixture: CategoryFixture | null;
}

export const ShareableFixture = React.forwardRef<HTMLDivElement, ShareableFixtureProps>(
  ({ tournamentName, categoryFixture }, ref) => {
    if (!categoryFixture) {
      return null;
    }

    // Since this component is rendered off-screen, we need to ensure the styles are self-contained
    // and don't rely on parent styles that might not apply.
    const containerStyle: React.CSSProperties = {
        width: '800px',
        fontFamily: "'PT Sans', sans-serif",
        backgroundColor: 'hsl(var(--background))',
        color: 'hsl(var(--foreground))',
    };

    return (
      <div ref={ref} className="p-8" style={containerStyle}>
        <Card className="border-2 border-primary shadow-2xl">
          <CardHeader className="text-center bg-card pb-4">
            <CardTitle className="text-4xl font-bold text-primary">{tournamentName}</CardTitle>
            <p className="text-2xl text-muted-foreground pt-2">{categoryFixture.categoryName}</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {categoryFixture.groups.map((group, groupIndex) => (
              <React.Fragment key={group.id}>
                <div >
                  <h3 className="text-2xl font-semibold text-center mb-4 pb-2 border-b-2 border-primary">{group.name}</h3>
                  <div className="grid grid-cols-2 gap-x-8">
                    <div>
                      <h4 className="text-lg font-bold mb-3 text-primary uppercase tracking-wider">Duplas</h4>
                      <ul className="space-y-2">
                        {group.duplas.map((dupla) => (
                          <li key={dupla.id} className="text-md font-medium">{dupla.nombre}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold mb-3 text-primary uppercase tracking-wider">Partidos</h4>
                      <ul className="space-y-3">
                        {group.matches.map((match) => (
                          <li key={match.id} className="text-md border-b border-border/50 pb-2">
                            <p className="font-semibold">{match.dupla1.nombre}</p>
                            <p className="text-center font-bold text-primary text-sm my-1">vs</p>
                            <p className="font-semibold">{match.dupla2.nombre}</p>
                            <p className="text-sm text-muted-foreground text-right mt-1">
                              {match.court ? (typeof match.court === 'number' ? `Cancha ${match.court}`: match.court) : 'Cancha TBD'} • {match.time || 'Hora TBD'}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
                {groupIndex < categoryFixture.groups.length - 1 && <Separator className="my-8" />}
              </React.Fragment>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }
);

ShareableFixture.displayName = 'ShareableFixture';
