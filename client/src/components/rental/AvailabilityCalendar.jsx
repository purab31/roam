import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Info } from 'lucide-react';

/**
 * UI Section 8.3: Rental Availability Calendar
 * - Month grid view
 * - Unavailable days struck through in --text-faint
 * - Selected range in black fill with white text
 * - Today outlined
 * - Legend showing available, booked/blocked, and selected days
 */
export function AvailabilityCalendar({
  listingId,
  selectedRange,
  onRangeSelect,
  className = '',
}) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // First day of month and number of days
  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Range for query window (first day of current month to end of current month)
  const windowStart = new Date(year, month, 1).toISOString();
  const windowEnd = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const { data: availabilityData, isLoading } = useQuery({
    queryKey: ['listingAvailability', listingId, year, month],
    queryFn: async () => {
      const res = await fetch(
        `/api/listings/${listingId}/availability?from=${windowStart}&to=${windowEnd}`
      );
      const json = await res.json();
      return json.success ? json.data : null;
    },
    enabled: !!listingId,
  });

  const confirmedBookings = availabilityData?.confirmedBookings || [];
  const unavailableDates = availabilityData?.unavailableDates || [];

  // Helper to check if a specific day is blocked/unavailable
  const isDateBlocked = date => {
    const dTime = date.getTime();
    const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));
    if (isPast) return true;

    // Check confirmed bookings (existing.startDate <= d AND existing.endDate > d)
    const inBooking = confirmedBookings.some(b => {
      const bStart = new Date(b.startDate).setHours(0, 0, 0, 0);
      const bEnd = new Date(b.endDate).setHours(0, 0, 0, 0);
      return dTime >= bStart && dTime < bEnd;
    });
    if (inBooking) return true;

    // Check owner blocked ranges
    const inBlocked = unavailableDates.some(u => {
      const uStart = new Date(u.startDate).setHours(0, 0, 0, 0);
      const uEnd = new Date(u.endDate).setHours(0, 0, 0, 0);
      return dTime >= uStart && dTime <= uEnd;
    });

    return inBlocked;
  };

  // Helper to check if a day is in selected range
  const isDateSelected = date => {
    if (!selectedRange?.start) return false;
    const dTime = date.getTime();
    const sTime = new Date(selectedRange.start).setHours(0, 0, 0, 0);

    if (!selectedRange.end) {
      return dTime === sTime;
    }
    const eTime = new Date(selectedRange.end).setHours(0, 0, 0, 0);
    return dTime >= sTime && dTime <= eTime;
  };

  const handleDateClick = day => {
    const clickedDate = new Date(year, month, day);
    if (isDateBlocked(clickedDate)) return;

    if (!onRangeSelect) return;

    if (!selectedRange?.start || (selectedRange.start && selectedRange.end)) {
      // Starting new selection
      onRangeSelect({ start: clickedDate, end: null });
    } else if (selectedRange.start && !selectedRange.end) {
      const sDate = new Date(selectedRange.start);
      if (clickedDate <= sDate) {
        // Reset or new start
        onRangeSelect({ start: clickedDate, end: null });
      } else {
        // Check if any date between start and end is blocked
        let hasBlockedBetween = false;
        let curr = new Date(sDate);
        while (curr <= clickedDate) {
          if (isDateBlocked(curr)) {
            hasBlockedBetween = true;
            break;
          }
          curr.setDate(curr.getDate() + 1);
        }

        if (hasBlockedBetween) {
          // Cannot span over blocked dates
          onRangeSelect({ start: clickedDate, end: null });
        } else {
          onRangeSelect({ start: sDate, end: clickedDate });
        }
      }
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className={`p-6 rounded-[24px] border border-border bg-surface ${className}`}>
      {/* Month Navigation Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[16px] font-medium text-text">
          {monthNames[month]} {year}
        </h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={prevMonth}
            aria-label="Previous Month"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text hover:bg-tile transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={nextMonth}
            aria-label="Next Month"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-text hover:bg-tile transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-1 text-center mb-2">
        {daysOfWeek.map(dw => (
          <span key={dw} className="text-[11px] font-medium text-muted uppercase tracking-wider py-1">
            {dw}
          </span>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1.5 text-center">
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="h-10" />
        ))}

        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const thisDate = new Date(year, month, day);
          const blocked = isDateBlocked(thisDate);
          const selected = isDateSelected(thisDate);
          const isToday =
            thisDate.toDateString() === new Date().toDateString();

          let btnClasses =
            'w-full h-10 rounded-full text-[13px] font-medium transition-all flex items-center justify-center relative ';

          if (selected) {
            btnClasses += 'bg-primary text-on-primary shadow-sm';
          } else if (blocked) {
            btnClasses += 'text-text-faint line-through cursor-not-allowed opacity-50';
          } else {
            btnClasses += 'text-text hover:bg-tile cursor-pointer';
          }

          if (isToday && !selected) {
            btnClasses += ' border border-text/40';
          }

          return (
            <button
              key={`day-${day}`}
              type="button"
              disabled={blocked}
              onClick={() => handleDateClick(day)}
              className={btnClasses}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-muted border-t border-border mt-6 pt-4">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full border border-border bg-surface" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-text-faint/30 line-through text-[8px] flex items-center justify-center">
            -
          </span>
          <span>Unavailable</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-primary" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
