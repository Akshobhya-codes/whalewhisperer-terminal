import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SpectateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFriend: (userId: string, username: string) => void;
}

const SpectateModal = ({ isOpen, onClose, onSelectFriend }: SpectateModalProps) => {
  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_leaderboard');
      if (error) throw error;
      return data;
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            👀 Spectate a Friend
          </DialogTitle>
          <DialogDescription>
            Choose a whale to watch in action
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="text-center py-8">Loading traders...</div>
        ) : (
          <div className="space-y-2">
            {leaderboard?.map((trader: any, index: number) => (
              <div
                key={trader.id}
                className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Badge variant={index === 0 ? "default" : "outline"}>
                    #{index + 1}
                  </Badge>
                  <Avatar>
                    <AvatarImage src={trader.avatar_url} />
                    <AvatarFallback>{trader.username[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{trader.username}</div>
                    <div className="text-sm text-muted-foreground">
                      ${trader.portfolio_value?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`font-bold ${trader.total_pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {trader.total_pl >= 0 ? '+' : ''}{trader.total_pl?.toFixed(2) || '0.00'}
                    </div>
                    <div className={`text-xs ${trader.pl_percentage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {trader.pl_percentage >= 0 ? '+' : ''}{trader.pl_percentage?.toFixed(2) || '0.00'}%
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onSelectFriend(trader.id, trader.username);
                      onClose();
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Spectate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SpectateModal;
