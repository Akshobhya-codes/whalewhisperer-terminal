import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Plus, MessageCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Group = {
  id: string;
  name: string;
  invite_code: string;
  creator_id: string | null;
  created_at: string;
};

export default function Groups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUserGroups();
  }, []);

  const fetchUserGroups = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("group_members")
        .select("group_id, groups(*)")
        .eq("user_id", user.id);

      if (error) throw error;

      const groupsData = data?.map((item: any) => item.groups).filter(Boolean) || [];
      setGroups(groupsData);
    } catch (error) {
      console.error("Error fetching groups:", error);
    }
  };

  const createGroup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const code = Math.random().toString(36).substring(2, 8).toUpperCase();

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: newGroupName,
          invite_code: code,
          creator_id: user.id,
        })
        .select()
        .single();

      if (groupError) throw groupError;

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
        });

      if (memberError) throw memberError;

      toast({
        title: "Group Created!",
        description: `Invite code: ${code}`,
      });

      setNewGroupName("");
      setShowCreateDialog(false);
      fetchUserGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const joinGroup = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: group, error: groupError } = await supabase
        .from("groups")
        .select()
        .eq("invite_code", inviteCode.toUpperCase())
        .single();

      if (groupError || !group) {
        throw new Error("Invalid invite code");
      }

      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
        });

      if (memberError) {
        if (memberError.code === "23505") {
          throw new Error("You're already in this group");
        }
        throw memberError;
      }

      toast({
        title: "Joined Group!",
        description: `You've joined ${group.name}`,
      });

      setInviteCode("");
      setShowJoinDialog(false);
      fetchUserGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <Card className="border-primary/20 shadow-[0_0_30px_rgba(var(--primary),0.15)]">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-primary" />
                <CardTitle className="text-3xl">Your Groups</CardTitle>
              </div>
              
              <div className="flex gap-2">
                <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Group
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="groupName">Group Name</Label>
                        <Input
                          id="groupName"
                          placeholder="Enter group name"
                          value={newGroupName}
                          onChange={(e) => setNewGroupName(e.target.value)}
                        />
                      </div>
                      <Button onClick={createGroup} disabled={!newGroupName}>
                        Create
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={showJoinDialog} onOpenChange={setShowJoinDialog}>
                  <DialogTrigger asChild>
                    <Button variant="outline">Join Group</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Join Group</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="inviteCode">Invite Code</Label>
                        <Input
                          id="inviteCode"
                          placeholder="Enter invite code"
                          value={inviteCode}
                          onChange={(e) => setInviteCode(e.target.value)}
                        />
                      </div>
                      <Button onClick={joinGroup} disabled={!inviteCode}>
                        Join
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {groups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                You haven't joined any groups yet. Create one or join with an invite code!
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    className="border-primary/10 hover:border-primary/30 transition-all cursor-pointer"
                  >
                    <CardHeader>
                      <CardTitle className="text-xl">{group.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        Code: {group.invite_code}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full">
                        <MessageCircle className="w-4 h-4 mr-2" />
                        View Group
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
