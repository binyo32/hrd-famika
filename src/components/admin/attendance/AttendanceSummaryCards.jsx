import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Fingerprint, CalendarDays, UserPlus } from "lucide-react";

const AttendanceSummaryCards = ({ summary, mode }) => {
  const labels = React.useMemo(() => {
    if (mode === "unchecked") {
      return {
        checkInTitle: "Belum Check-in",
        checkOutTitle: "Total Check-out",
        hadirTitle: "Tidak Hadir",
        hadirSub: "belum melakukan check-in",
      };
    }

    return {
      checkInTitle: "Total Check-in",
      checkOutTitle: "Total Check-out",
      hadirTitle: "Data Kehadiran",
      hadirSub: "berdasarkan check-in",
    };
  }, [mode]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      {/* CARD 1 */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {labels.checkInTitle}
            </p>
            <p className="text-2xl font-bold">
              {summary.totalCheckIn}
            </p>
            <p className="text-xs">employee</p>
          </div>
          <Fingerprint className="h-8 w-8 text-blue-500" />
        </CardContent>
      </Card>

      {/* CARD 2 */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {labels.checkOutTitle}
            </p>
            <p className="text-2xl font-bold">
              {summary.totalCheckOut}
            </p>
          </div>
          <CalendarDays className="h-8 w-8 text-green-500" />
        </CardContent>
      </Card>

      {/* CARD 3 */}
      <Card>
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">
              {labels.hadirTitle}
            </p>
            <p className="text-2xl font-bold">
              {summary.hadirByCheckIn}
            </p>
            <p className="text-xs text-muted-foreground">
              {labels.hadirSub}
            </p>
          </div>
          <UserPlus className="h-8 w-8 text-purple-500" />
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendanceSummaryCards;
