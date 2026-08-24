import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Settings, Award, Plus, Heart, Trash2, GraduationCap, ShoppingCart } from "lucide-react";
import type { AlumniBadge, User as UserType, Memory, School } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { BADGE_SLOT_PRICE } from "@shared/constants";

export default function ProfilePage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<UserType | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "tagged" | "badges">("posts");
  const [showBuySlotsDialog, setShowBuySlotsDialog] = useState(false);
  const [slotsToBuy, setSlotsToBuy] = useState(1);
  const [showAllBadges, setShowAllBadges] = useState(false);
  const { toast } = useToast();
  const { convertPrice, formatPrice } = useCurrency();

  useEffect(() => {
    const userData = localStorage.getItem("user");
    if (userData) {
      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);
      fetch(`/api/users/${parsedUser.id}`)
        .then(res => res.json())
        .then(updatedUser => {
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
        })
        .catch(err => console.error('Failed to refresh user data:', err));
    }
  }, []);

  const { data: alumniBadges = [] } = useQuery<AlumniBadge[]>({
    queryKey: ["/api/alumni-badges", user?.id],
    enabled: !!user,
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/alumni-badges/${user.id}`);
      if (!res.ok) throw new Error("Failed to fetch alumni badges");
      return res.json();
    }
  });

  const { data: schools = [] } = useQuery<School[]>({
    queryKey: ["/api/schools"],
    enabled: !!user,
  });

  const { data: userMemories = [] } = useQuery<Memory[]>({
    queryKey: ["/api/memories/user", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];
      const res = await fetch(`/api/memories/user/${user.id}`);
      if (!res.ok) return [];
      return res.json();
    }
  });

  const getSchoolLogo = (schoolName: string): string | null => {
    const school = schools.find(s => s.name === schoolName);
    return school?.logo || null;
  };

  const deleteAlumniBadgeMutation = useMutation({
    mutationFn: async (badgeId: string) => {
      await apiRequest("DELETE", `/api/alumni-badges/${badgeId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/alumni-badges", user?.id] });
      toast({
        title: "Badge deleted",
        description: "Alumni badge has been successfully deleted.",
      });
    },
  });

  const addBadgeSlotsToCartMutation = useMutation({
    mutationFn: async (numberOfSlots: number) => {
      const totalPrice = (BADGE_SLOT_PRICE * numberOfSlots).toFixed(2);
      await apiRequest("POST", "/api/cart", {
        userId: user?.id,
        itemType: "badge_slot",
        quantity: numberOfSlots,
        price: totalPrice,
        schoolId: null,
        year: null,
        orientation: null,
        uploadType: null
      });
    },
    onSuccess: () => {
      setShowBuySlotsDialog(false);
      setSlotsToBuy(1);
      queryClient.invalidateQueries({ queryKey: ["/api/cart", user?.id] });
      toast({
        className: "bg-green-600/60 backdrop-blur-lg border border-white/20 shadow-2xl text-white",
        title: "Added to cart! 🛒",
        description: `${slotsToBuy} badge slot(s) added to your cart. Go to cart to checkout.`,
      });
    },
  });

  const publicMemories = useMemo(() => 
    userMemories.filter(m => m.status === 'approved'), 
    [userMemories]
  );

  const taggedMemories = useMemo(() => 
    userMemories.filter(m => m.uploadedBy === user?.fullName && m.status === 'approved'),
    [userMemories, user?.fullName]
  );

  if (!user) return null;

  const maxAlumniBadges = user?.badgeSlots || 4;
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header Section */}
        <div className="text-center mb-12 space-y-6">
          {/* Profile Picture */}
          <div className="flex justify-center">
            <Avatar className="h-32 w-32 border-4 border-cyan-400/30">
              <AvatarImage src={user.profileImage || undefined} />
              <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white">
                {getInitials(user.fullName || user.email)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Name & Username */}
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">{user.fullName}</h1>
            <p className="text-lg text-cyan-300">@{user.username}</p>
          </div>

          {/* Stats Row */}
          <div className="flex justify-center gap-12 mt-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{publicMemories.length}</div>
              <div className="text-sm text-white/60 mt-1">Posts</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{taggedMemories.length}</div>
              <div className="text-sm text-white/60 mt-1">Tagged</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">{alumniBadges.length}</div>
              <div className="text-sm text-white/60 mt-1">Badges</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4 mt-8">
            <Button
              onClick={() => setLocation("/viewer-settings")}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white"
              data-testid="button-settings"
            >
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={() => setLocation("/request-alumni-status")}
              variant="outline"
              className="border-cyan-400/30 text-cyan-300 hover:bg-cyan-400/10"
              data-testid="button-request-alumni"
            >
              <Plus className="h-4 w-4 mr-2" />
              Request Alumni
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-8 mb-12 border-b border-white/10">
          {["posts", "tagged", "badges"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={`py-4 px-2 font-medium transition-colors relative capitalize ${
                activeTab === tab
                  ? "text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
              data-testid={`tab-${tab}`}
            >
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 to-blue-400" />
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {/* Posts Tab */}
          {activeTab === "posts" && (
            <div>
              {publicMemories.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">No posts yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publicMemories.map((memory) => (
                    <Dialog key={memory.id}>
                      <DialogTrigger asChild>
                        <Card 
                          className="bg-white/5 border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 transition-all"
                          data-testid={`card-memory-${memory.id}`}
                        >
                          <CardContent className="p-0 aspect-square">
                            {memory.imageUrl ? (
                              <img 
                                src={memory.imageUrl} 
                                alt={memory.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <Heart className="h-8 w-8 text-white/30" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl max-w-2xl">
                        <div className="space-y-4">
                          {memory.imageUrl ? (
                            <img src={memory.imageUrl} alt={memory.title} className="w-full rounded-lg" />
                          ) : null}
                          <div className="text-white">
                            <h3 className="text-lg font-semibold mb-2">{memory.title}</h3>
                            <p className="text-white/70 text-sm">{memory.description}</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tagged Tab */}
          {activeTab === "tagged" && (
            <div>
              {taggedMemories.length === 0 ? (
                <div className="text-center py-12">
                  <Heart className="h-12 w-12 text-white/30 mx-auto mb-4" />
                  <p className="text-white/60">No tagged memories yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {taggedMemories.map((memory) => (
                    <Dialog key={memory.id}>
                      <DialogTrigger asChild>
                        <Card 
                          className="bg-white/5 border-white/10 overflow-hidden cursor-pointer hover:bg-white/10 transition-all"
                          data-testid={`card-tagged-${memory.id}`}
                        >
                          <CardContent className="p-0 aspect-square">
                            {memory.imageUrl ? (
                              <img 
                                src={memory.imageUrl} 
                                alt={memory.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                <Heart className="h-8 w-8 text-white/30" />
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      </DialogTrigger>
                      <DialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl max-w-2xl">
                        <div className="space-y-4">
                          {memory.imageUrl ? (
                            <img src={memory.imageUrl} alt={memory.title} className="w-full rounded-lg" />
                          ) : null}
                          <div className="text-white">
                            <h3 className="text-lg font-semibold mb-2">{memory.title}</h3>
                            <p className="text-white/70 text-sm">{memory.description}</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Badges Tab */}
          {activeTab === "badges" && (
            <div className="space-y-6">
              {/* Slots Info & Management Buttons */}
              <Card className="bg-white/10 backdrop-blur-lg border border-white/20">
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-bold text-white mb-2">Alumni Badges</h3>
                      <p className="text-blue-200 text-sm">
                        {alumniBadges.length} / {maxAlumniBadges} slots used
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setLocation("/request-alumni-status")}
                        disabled={alumniBadges.length >= maxAlumniBadges}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                        data-testid="button-request-alumni-badge"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Request Alumni Status
                      </Button>
                      <Button
                        onClick={() => setShowBuySlotsDialog(true)}
                        variant="outline"
                        className="bg-yellow-500/20 border border-yellow-400 text-white"
                        data-testid="button-buy-slots"
                      >
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        Buy More Slots
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Badges Grid */}
              <div>
                {alumniBadges.length === 0 && maxAlumniBadges <= 4 ? (
                  <div className="text-center py-12">
                    <Award className="h-12 w-12 text-white/30 mx-auto mb-4" />
                    <p className="text-white/60 mb-6">No alumni badges yet</p>
                    <Button
                      onClick={() => setLocation("/request-alumni-status")}
                      className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Request Alumni Status
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Show first 4 badges or all if less than 4 slots */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      {/* Existing badges - limited to 4 */}
                      {alumniBadges.slice(0, 4).map((badge) => (
                        <Card 
                          key={badge.id}
                          className={`border-2 ${
                            badge.status === "verified" 
                              ? "bg-green-500/30 border-green-500" 
                              : "bg-orange-500/30 border-orange-500"
                          }`}
                          data-testid={`card-badge-${badge.id}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-2">
                                  {getSchoolLogo(badge.school) ? (
                                    <img 
                                      src={getSchoolLogo(badge.school)?.startsWith('http') ? getSchoolLogo(badge.school)! : `/public${getSchoolLogo(badge.school)}`} 
                                      alt={badge.school}
                                      className="h-6 w-6 rounded-full object-cover border border-white/20"
                                    />
                                  ) : (
                                    <GraduationCap className={`h-4 w-4 ${
                                      badge.status === "verified" ? "text-green-600" : "text-orange-600"
                                    }`} />
                                  )}
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    badge.status === "verified"
                                      ? "bg-green-100 text-green-800" 
                                      : "bg-orange-100 text-orange-800"
                                  }`}>
                                    {badge.status === "verified" ? "Approved" : "Pending"}
                                  </span>
                                </div>
                                <h4 className="font-semibold text-white text-sm">{badge.school}</h4>
                                <p className="text-sm text-gray-50">Class of {badge.graduationYear}</p>
                                <p className="text-xs text-gray-50">Admitted: {badge.admissionYear}</p>
                              </div>
                              <div className="ml-2">
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1"
                                      data-testid={`button-delete-badge-${badge.id}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl text-white">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Alumni Badge?</AlertDialogTitle>
                                      <AlertDialogDescription className="space-y-2 text-white">
                                        <p>Are you sure you want to delete this alumni badge for <strong>{badge.school}</strong>?</p>
                                        <div className="bg-amber-500/30 rounded p-3 text-sm">
                                          <p className="font-medium text-amber-50 mb-1">⚠️ Important Warning:</p>
                                          <ul className="text-amber-50 space-y-1">
                                            <li>• This action is <strong>irreversible</strong></li>
                                            <li>• You will lose your verified/pending status for this school</li>
                                          </ul>
                                        </div>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-white/10 border border-white/20">Cancel</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deleteAlumniBadgeMutation.mutate(badge.id)}
                                        className="bg-red-600/80 hover:bg-red-600"
                                        data-testid={`button-confirm-delete-${badge.id}`}
                                      >
                                        Delete Badge
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {/* Empty slots */}
                      {alumniBadges.length < 4 && Array.from({ length: Math.min(4 - alumniBadges.length, maxAlumniBadges - alumniBadges.length) }).map((_, index) => (
                        <Card key={`empty-${index}`} className="border-2 border-dashed border-white/30 bg-white/5" data-testid={`card-empty-slot-${index}`}>
                          <CardContent className="p-4 flex items-center justify-center h-24">
                            <div className="text-center text-white/40">
                              <Plus className="h-6 w-6 mx-auto mb-1" />
                              <p className="text-xs">Empty Slot</p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* See All Badges Dialog */}
                    {maxAlumniBadges > 4 && (
                      <div className="text-center">
                        <Dialog open={showAllBadges} onOpenChange={setShowAllBadges}>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              className="bg-white/10 hover:bg-white/20 text-white border-white/20"
                              data-testid="button-see-all-badges"
                            >
                              <Award className="h-4 w-4 mr-2" />
                              See All {maxAlumniBadges} Slots
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl text-white max-w-4xl max-h-[80vh] overflow-y-auto">
                            <div className="space-y-4">
                              <h3 className="text-xl font-semibold">All Alumni Badge Slots ({alumniBadges.length}/{maxAlumniBadges})</h3>
                              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                {/* Show all existing badges */}
                                {alumniBadges.map((badge) => (
                                  <Card 
                                    key={badge.id}
                                    className={`border-2 ${
                                      badge.status === "verified" 
                                        ? "bg-green-500/30 border-green-500" 
                                        : "bg-orange-500/30 border-orange-500"
                                    }`}
                                  >
                                    <CardContent className="p-4">
                                      <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                          <div className="flex items-center space-x-2 mb-2">
                                            {getSchoolLogo(badge.school) ? (
                                              <img 
                                                src={getSchoolLogo(badge.school)?.startsWith('http') ? getSchoolLogo(badge.school)! : `/public${getSchoolLogo(badge.school)}`} 
                                                alt={badge.school}
                                                className="h-6 w-6 rounded-full object-cover border border-white/20"
                                              />
                                            ) : (
                                              <GraduationCap className={`h-4 w-4 ${
                                                badge.status === "verified" ? "text-green-600" : "text-orange-600"
                                              }`} />
                                            )}
                                            <span className={`px-2 py-1 text-xs rounded-full ${
                                              badge.status === "verified"
                                                ? "bg-green-100 text-green-800" 
                                                : "bg-orange-100 text-orange-800"
                                            }`}>
                                              {badge.status === "verified" ? "Approved" : "Pending"}
                                            </span>
                                          </div>
                                          <h4 className="font-semibold text-white text-sm">{badge.school}</h4>
                                          <p className="text-sm text-gray-50">Class of {badge.graduationYear}</p>
                                          <p className="text-xs text-gray-50">Admitted: {badge.admissionYear}</p>
                                        </div>
                                        <AlertDialog>
                                          <AlertDialogTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="sm"
                                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1 ml-2"
                                            >
                                              <Trash2 className="h-3 w-3" />
                                            </Button>
                                          </AlertDialogTrigger>
                                          <AlertDialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl text-white">
                                            <AlertDialogHeader>
                                              <AlertDialogTitle>Delete Alumni Badge?</AlertDialogTitle>
                                              <AlertDialogDescription className="space-y-2 text-white">
                                                <p>Are you sure you want to delete this alumni badge for <strong>{badge.school}</strong>?</p>
                                              </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                              <AlertDialogCancel className="bg-white/10 border border-white/20">Cancel</AlertDialogCancel>
                                              <AlertDialogAction
                                                onClick={() => deleteAlumniBadgeMutation.mutate(badge.id)}
                                                className="bg-red-600/80 hover:bg-red-600"
                                              >
                                                Delete Badge
                                              </AlertDialogAction>
                                            </AlertDialogFooter>
                                          </AlertDialogContent>
                                        </AlertDialog>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}

                                {/* Show all empty slots */}
                                {Array.from({ length: maxAlumniBadges - alumniBadges.length }).map((_, index) => (
                                  <Card key={`all-empty-${index}`} className="border-2 border-dashed border-white/30 bg-white/5">
                                    <CardContent className="p-4 flex items-center justify-center h-24">
                                      <div className="text-center text-white/40">
                                        <Plus className="h-6 w-6 mx-auto mb-1" />
                                        <p className="text-xs">Empty Slot</p>
                                      </div>
                                    </CardContent>
                                  </Card>
                                ))}
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Buy Slots Dialog */}
              <Dialog open={showBuySlotsDialog} onOpenChange={setShowBuySlotsDialog}>
                <DialogContent className="bg-white/10 backdrop-blur-lg border border-white/20 shadow-2xl text-white max-w-md">
                  <div className="space-y-4">
                    <h3 className="text-xl font-semibold">Buy More Badge Slots</h3>
                    <p className="text-white/70 text-sm">
                      Each slot costs {formatPrice(BADGE_SLOT_PRICE)}
                    </p>
                    
                    <div className="space-y-3">
                      <label className="block">
                        <span className="text-white/80 text-sm mb-2 block">Number of Slots:</span>
                        <select 
                          value={slotsToBuy}
                          onChange={(e) => setSlotsToBuy(parseInt(e.target.value))}
                          className="w-full bg-white/10 border border-white/20 text-white rounded px-3 py-2"
                        >
                          {[1, 2, 3, 4, 5].map(n => (
                            <option key={n} value={n}>{n}</option>
                          ))}
                        </select>
                      </label>
                      
                      <div className="bg-white/5 rounded p-3">
                        <p className="text-white/70 text-sm mb-1">Total Cost:</p>
                        <p className="text-2xl font-bold text-cyan-300">
                          {formatPrice((BADGE_SLOT_PRICE * slotsToBuy).toString())}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button
                        onClick={() => setShowBuySlotsDialog(false)}
                        variant="outline"
                        className="bg-white/10 border border-white/20 text-white flex-1"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={() => addBadgeSlotsToCartMutation.mutate(slotsToBuy)}
                        disabled={addBadgeSlotsToCartMutation.isPending}
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white flex-1"
                      >
                        {addBadgeSlotsToCartMutation.isPending ? "Adding..." : "Add to Cart"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
