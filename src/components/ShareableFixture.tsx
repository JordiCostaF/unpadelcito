
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

    // Styles for the container that will be converted to an image.
    const containerStyle: React.CSSProperties = {
        // Increased width to better accommodate two columns.
        width: '1200px', 
        fontFamily: "'PT Sans', sans-serif",
        backgroundColor: '#0A0A0A', // Dark background
        color: '#FFFFFF', // White text
        padding: '2rem',
    };

    const numGroups = categoryFixture.groups.length;

    return (
      <div ref={ref} style={containerStyle}>
        <Card className="border-2 border-primary shadow-2xl bg-card">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-4xl font-bold text-primary">{tournamentName}</CardTitle>
            <p className="text-2xl text-muted-foreground pt-2">{categoryFixture.categoryName}</p>
          </CardHeader>
          <CardContent className="pt-6">
            {/* Use a multi-column grid if there is more than one group */}
            <div className={`grid ${numGroups > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-x-8 gap-y-8`}>
              {categoryFixture.groups.map((group) => (
                // Each group is a block. `break-inside-avoid` helps prevent it from splitting across columns.
                <div key={group.id} className="border border-border p-4 rounded-lg flex flex-col" style={{breakInside: 'avoid'}}>
                  <h3 className="text-2xl font-semibold text-center mb-4 pb-2 border-b-2 border-primary">{group.name}</h3>
                  
                  {/* Content inside each group is stacked vertically for a compact view */}
                  <div className="flex-grow">
                    <h4 className="text-lg font-bold mb-3 text-primary uppercase tracking-wider">Duplas</h4>
                    <ul className="space-y-2 mb-6">
                      {group.duplas.map((dupla) => (
                        <li key={dupla.id} className="text-md font-medium">{dupla.nombre}</li>
                      ))}
                    </ul>

                    <Separator className="my-4"/>

                    <h4 className="text-lg font-bold mb-3 text-primary uppercase tracking-wider">Partidos</h4>
                    <ul className="space-y-3">
                      {group.matches.map((match) => (
                        <li key={match.id} className="text-md border-b border-border/50 pb-2 last:border-b-0">
                           <div className="flex justify-between items-center gap-4">
                            <p className="flex-grow font-semibold">
                                {match.dupla1.nombre}
                                <span className="text-center font-bold text-primary text-sm mx-2">vs</span>
                                {match.dupla2.nombre}
                            </p>
                            <div className="text-sm text-muted-foreground text-right shrink-0">
                              <p>{match.court ? (typeof match.court === 'number' ? `Cancha ${match.court}`: match.court) : 'TBD'}</p>
                              <p>{match.time || 'TBD'}</p>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

ShareableFixture.displayName = 'ShareableFixture';
