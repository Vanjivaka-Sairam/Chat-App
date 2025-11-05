import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowLeft, Check } from "lucide-react";
import { getFriendRequests, acceptFriendRequest } from "../lib/api";
import { getLanguageFlag } from "../components/FriendCard";

const NotificationsPage = () => {
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ["friendRequests"],
    queryFn: getFriendRequests,
  });

  const { mutate: acceptRequest, isPending: accepting } = useMutation({
    mutationFn: acceptFriendRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["friendRequests"] });
      queryClient.invalidateQueries({ queryKey: ["friends"] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  const incomingReqs = data?.incomingReqs || [];
  const acceptedReqs = data?.acceptedReqs || [];

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="container mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Link to="/" className="btn btn-ghost btn-circle">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-3xl font-bold">Friend Requests</h1>
        </div>

        {/* Incoming Requests */}
        <div className="card bg-base-200 shadow-xl mb-6">
          <div className="card-body">
            <h2 className="text-2xl font-semibold mb-4">Incoming Requests</h2>
            {incomingReqs.length === 0 ? (
              <p className="text-base-content opacity-70">No incoming friend requests</p>
            ) : (
              <div className="space-y-3">
                {incomingReqs.map((req) => (
                  <div
                    key={req._id}
                    className="flex items-center gap-4 p-4 bg-base-100 rounded-lg"
                  >
                    <div className="avatar">
                      <div className="w-16 rounded-full">
                        <img src={req.sender?.profilePic || ""} alt={req.sender?.fullName} />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{req.sender?.fullName}</h3>
                      <div className="flex gap-2 mt-1">
                        {req.sender?.nativeLanguage && (
                          <span className="badge badge-secondary text-xs">
                            {getLanguageFlag(req.sender.nativeLanguage)}
                            {req.sender.nativeLanguage}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => acceptRequest(req._id)}
                        disabled={accepting}
                      >
                        <Check size={16} className="mr-1" />
                        Accept
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Accepted Requests (recent) */}
        {acceptedReqs.length > 0 && (
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="text-2xl font-semibold mb-4">Recently Accepted</h2>
              <div className="space-y-3">
                {acceptedReqs.map((req) => {
                  // Get the other user (not the current user)
                  const senderId = req.sender?._id?.toString();
                  const recipientId = req.recipient?._id?.toString();
                  
                  // For display, show sender's info
                  const friendPic = req.sender?.profilePic || req.recipient?.profilePic || "";
                  const friendName = req.sender?.fullName || req.recipient?.fullName || "Unknown";
                  
                  return (
                    <div
                      key={req._id}
                      className="flex items-center gap-4 p-4 bg-base-100 rounded-lg"
                    >
                      <div className="avatar">
                        <div className="w-16 rounded-full">
                          <img 
                            src={friendPic} 
                            alt={friendName} 
                          />
                        </div>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{friendName}</h3>
                      </div>
                      <span className="badge badge-success">Friends</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
