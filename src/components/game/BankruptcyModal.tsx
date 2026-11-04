import React from 'react';
import { GameState, BankruptcyState } from '@/game/types';
import {
    getPropertyData,
    canSellHouse,
    canMortgage,
    calculateLiquidAssets,
} from '@/game/engine';
import { Button } from '@/components/ui/button';
import {
    AlertTriangle,
    Home,
    Lock,
    DollarSign,
    TrendingUp,
} from 'lucide-react';

interface BankruptcyModalProps {
    gameState: GameState;
    bankruptcyState: BankruptcyState;
    onSellHouse: (position: number) => void;
    onMortgage: (position: number) => void;
    onAttemptPayment: () => void;
    onDeclareBankruptcy: () => void;
}

export const BankruptcyModal: React.FC<BankruptcyModalProps> = ({
    gameState,
    bankruptcyState,
    onSellHouse,
    onMortgage,
    onAttemptPayment,
    onDeclareBankruptcy,
}) => {
    const player = gameState.players.find(p => p.id === bankruptcyState.playerId);
    if (!player) return null;

    const creditor = bankruptcyState.creditorId !== null
        ? gameState.players.find(p => p.id === bankruptcyState.creditorId)
        : null;

    const playerProperties = gameState.ownedProperties.filter(p => p.ownerId === player.id);
    const sellableHouses = playerProperties.filter(p => canSellHouse(gameState, player.id, p.position));
    const mortgageableProperties = playerProperties.filter(p => canMortgage(gameState, player.id, p.position));

    const liquidAssets = calculateLiquidAssets(gameState, player.id);
    const canAfford = player.money >= bankruptcyState.amountOwed;
    const shortfall = bankruptcyState.amountOwed - player.money;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="glass-card w-full max-w-2xl p-6 space-y-6 animate-bounce-in">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-destructive/20 flex items-center justify-center">
                        <AlertTriangle className="w-8 h-8 text-destructive" />
                    </div>
                    <div className="flex-1">
                        <h2 className="font-display text-2xl text-foreground">Cannot Afford Payment</h2>
                        <p className="text-sm text-muted-foreground">
                            You need to raise cash or declare bankruptcy
                        </p>
                    </div>
                </div>

                {/* Payment Details */}
                <div className="glass-panel p-4 space-y-2">
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Amount Owed:</span>
                        <span className="text-xl font-bold text-destructive">${bankruptcyState.amountOwed}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Reason:</span>
                        <span className="text-foreground">{bankruptcyState.reason}</span>
                    </div>
                    {creditor && (
                        <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Owed To:</span>
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-4 h-4 rounded-full"
                                    style={{ backgroundColor: creditor.color }}
                                />
                                <span className="text-foreground">{creditor.name}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Current Status */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="glass-panel p-3 text-center">
                        <DollarSign className="w-5 h-5 mx-auto mb-1 text-primary" />
                        <div className="text-xs text-muted-foreground">Current Cash</div>
                        <div className="text-lg font-bold text-foreground">${player.money}</div>
                    </div>
                    <div className="glass-panel p-3 text-center">
                        <TrendingUp className="w-5 h-5 mx-auto mb-1 text-accent" />
                        <div className="text-xs text-muted-foreground">Liquid Assets</div>
                        <div className="text-lg font-bold text-foreground">${liquidAssets}</div>
                    </div>
                    <div className="glass-panel p-3 text-center">
                        <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-destructive" />
                        <div className="text-xs text-muted-foreground">Shortfall</div>
                        <div className="text-lg font-bold text-destructive">${Math.max(0, shortfall)}</div>
                    </div>
                </div>

                {/* Actions to Raise Cash */}
                {!canAfford && (
                    <div className="space-y-4">
                        <h3 className="font-display text-lg text-foreground">Raise Cash</h3>

                        {/* Sell Houses */}
                        {sellableHouses.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Home className="w-4 h-4" />
                                    Sell Buildings
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {sellableHouses.map(owned => {
                                        const prop = getPropertyData(owned.position)!;
                                        const sellValue = Math.floor(prop.houseCost! / 2);
                                        return (
                                            <Button
                                                key={owned.position}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onSellHouse(owned.position)}
                                                className="text-xs h-8"
                                            >
                                                {prop.name.split(' ')[0]} (+${sellValue})
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Mortgage Properties */}
                        {mortgageableProperties.length > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Lock className="w-4 h-4" />
                                    Mortgage Properties
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {mortgageableProperties.map(owned => {
                                        const prop = getPropertyData(owned.position)!;
                                        return (
                                            <Button
                                                key={owned.position}
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onMortgage(owned.position)}
                                                className="text-xs h-8"
                                            >
                                                {prop.name.split(' ')[0]} (+${prop.mortgageValue})
                                            </Button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {sellableHouses.length === 0 && mortgageableProperties.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No assets available to sell or mortgage
                            </p>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                    <Button
                        onClick={onAttemptPayment}
                        disabled={!canAfford}
                        className="btn-primary flex-1"
                    >
                        {canAfford ? `Pay $${bankruptcyState.amountOwed}` : 'Cannot Pay Yet'}
                    </Button>
                    <Button
                        onClick={onDeclareBankruptcy}
                        variant="destructive"
                        className="flex-1"
                    >
                        Declare Bankruptcy
                    </Button>
                </div>

                {canAfford && (
                    <p className="text-xs text-center text-primary">
                        ✓ You now have enough cash to make the payment
                    </p>
                )}
            </div>
        </div>
    );
};
