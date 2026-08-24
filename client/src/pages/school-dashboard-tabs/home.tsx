import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, GraduationCap, Clock, FileImage, Search as SearchIcon, MapPin } from "lucide-react";
import type { User, School, AlumniRequest, Memory } from "@shared/schema";

interface SchoolDashboardHomeProps {
  user: User | null;
}

export default function SchoolDashboardHome({ user }: SchoolDashboardHomeProps) {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: school } = useQuery<School>({
    queryKey: ["/api/schools", user?.id],
    enabled: !!user,
  });

  const { data: allRequests = [] } = useQuery<AlumniRequest[]>({
    queryKey: ["/api/alumni-requests/school", school?.id],
    enabled: !!school?.id,
  });

  const { data: pendingMemories = [] } = useQuery<Memory[]>({
    queryKey: ["/api/memories/pending", school?.id],
    enabled: !!school?.id,
  });

  const { data: allSchools = [] } = useQuery<School[]>({
    queryKey: ['/api/schools/approved'],
  });

  const pendingRequests = allRequests.filter(request => request.status === 'pending');
  const approvedAlumni = allRequests.filter(request => request.status === 'approved');

  const filteredSchools = useMemo(() => {
    if (!searchTerm.trim()) return [];
    const term = searchTerm.toLowerCase();
    return allSchools.filter(s => 
      s.name.toLowerCase().includes(term) ||
      s.username.toLowerCase().includes(term) ||
      s.city?.toLowerCase().includes(term) ||
      s.state?.toLowerCase().includes(term)
    );
  }, [allSchools, searchTerm]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
          Welcome back, {school?.name || user?.fullName}
        </h1>
        <p className="text-sm sm:text-base text-white/70">
          Here's an overview of your yearbook platform
        </p>
      </div>

      {/* Search Other Schools Section */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <SearchIcon className="h-5 w-5 text-cyan-400" />
            Search Other Schools
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Input
              placeholder="Search by school name, username, city, or state..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
              data-testid="input-search-schools"
            />
            <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
          </div>

          {searchTerm.trim() && filteredSchools.length === 0 && (
            <p className="text-white/60 text-sm text-center py-4">
              No schools found matching "{searchTerm}"
            </p>
          )}

          {filteredSchools.length > 0 && (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              <p className="text-white/60 text-xs">
                Found {filteredSchools.length} {filteredSchools.length === 1 ? 'school' : 'schools'}
              </p>
              {filteredSchools.map((searchSchool) => (
                <div
                  key={searchSchool.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-3 hover:bg-white/10 transition-colors cursor-pointer"
                  onClick={() => setLocation(`/${searchSchool.username}`)}
                  data-testid={`button-school-${searchSchool.id}`}
                >
                  <h4 className="font-semibold text-white text-sm">{searchSchool.name}</h4>
                  <p className="text-white/60 text-xs mt-1">@{searchSchool.username}</p>
                  {(searchSchool.city || searchSchool.state) && (
                    <p className="text-white/50 text-xs mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {searchSchool.city}{searchSchool.state ? `, ${searchSchool.state}` : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/80">
              Pending Requests
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pendingRequests.length}</div>
            <p className="text-xs text-white/60 mt-1">Alumni verification requests</p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/80">
              Verified Alumni
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{approvedAlumni.length}</div>
            <p className="text-xs text-white/60 mt-1">Active alumni badges</p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/80">
              Pending Memories
            </CardTitle>
            <FileImage className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{pendingMemories.length}</div>
            <p className="text-xs text-white/60 mt-1">Awaiting approval</p>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-white/80">
              School Profile
            </CardTitle>
            <Users className="h-4 w-4 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{school?.name}</div>
            <p className="text-xs text-white/60 mt-1">{school?.email}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
