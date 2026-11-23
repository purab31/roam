import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Shield, ArrowRight, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { formatRupees, rupeesToPaise } from '../../utils/money';

/**
 * UI Section 7.5: Date Range Picker & Pricing Breakdown inside floating rental card
 */
export function DateRangePicker({
  listing,
  startDate,
  endDate,
  onDateChange,
  className = '',
}) {
  const navigate = useNavigate();

  const rental = listing?.rental || {};
  const dailyPrice = rental.dailyPrice || 0;
  const weeklyPrice = rental.weeklyPrice || 0;
  const deposit = rental.securityDeposit || 0;
  const minDays = rental.minDays || 1;
  const maxDays = rental.maxDays || 30;

  // Compute duration and estimate
  const calculation = useMemo(() => {
    if (!startDate || !endDate) return null;
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;

    const diffMs = end.getTime() - start.getTime();
    const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

    let baseRate = days * dailyPrice;
    let strategy = 'daily';

    if (weeklyPrice > 0) {
      const fullWeeks = Math.floor(days / 7);
      const remDays = days % 7;
      const weeklyPlusDaily = fullWeeks * weeklyPrice + remDays * dailyPrice;
      const ceilWeeks = Math.ceil(days / 7) * weeklyPrice;

      if (weeklyPlusDaily < baseRate) {
        baseRate = weeklyPlusDaily;
        strategy = 'weekly_plus_daily';
      }
      if (ceilWeeks < baseRate) {
        baseRate = ceilWeeks;
        strategy = 'round_up_weeks';
      }
    }

    const estimatedTotal = baseRate + deposit;

    return {
      days,
      baseRate,
      deposit,
      estimatedTotal,
      strategy,
      isBelowMin: days < minDays,
      isAboveMax: days > maxDays,
    };
  }, [startDate, endDate, dailyPrice, weeklyPrice, deposit, minDays, maxDays]);

  const handleStartChange = e => {
    const newStart = e.target.value;
    if (onDateChange) {
      onDateChange({ start: newStart, end: endDate });
    }
  };

  const handleEndChange = e => {
    const newEnd = e.target.value;
    if (onDateChange) {
      onDateChange({ start: startDate, end: newEnd });
    }
  };

  const handleBookClick = () => {
    if (!startDate || !endDate || !calculation) return;
    const listingId = listing._id || listing.id;
    navigate(`/listings/${listingId}/book?start=${new Date(startDate).toISOString()}&end=${new Date(endDate).toISOString()}`);
  };

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {/* Date Inputs */}
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted">Pickup Date</label>
          <div className="relative">
            <input
              type="date"
              value={startDate || ''}
              min={new Date().toISOString().split('T')[0]}
              onChange={handleStartChange}
              className="w-full h-11 px-3 text-[12px] rounded-full border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-text"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-medium text-muted">Return Date</label>
          <div className="relative">
            <input
              type="date"
              value={endDate || ''}
              min={startDate || new Date().toISOString().split('T')[0]}
              onChange={handleEndChange}
              className="w-full h-11 px-3 text-[12px] rounded-full border border-border bg-surface text-text focus:outline-none focus:ring-2 focus:ring-text"
            />
          </div>
        </div>
      </div>

      {/* Duration validation warnings */}
      {calculation?.isBelowMin && (
        <div className="p-2.5 rounded-[12px] bg-danger/10 border border-danger/20 text-[11px] text-danger flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Minimum rental duration is {minDays} {minDays === 1 ? 'day' : 'days'}.</span>
        </div>
      )}

      {calculation?.isAboveMax && (
        <div className="p-2.5 rounded-[12px] bg-danger/10 border border-danger/20 text-[11px] text-danger flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Maximum rental duration is {maxDays} days.</span>
        </div>
      )}

      {/* Cost Breakdown Calculation Card */}
      {calculation && !calculation.isBelowMin && !calculation.isAboveMax && (
        <div className="p-4 rounded-[16px] bg-tile/40 border border-border/80 flex flex-col gap-2 text-[12px]">
          <div className="flex items-center justify-between text-muted">
            <span>Duration</span>
            <span className="font-medium text-text">{calculation.days} {calculation.days === 1 ? 'day' : 'days'}</span>
          </div>

          <div className="flex items-center justify-between text-muted">
            <span>Rental Base Rate</span>
            <span className="font-medium text-text">{formatRupees(calculation.baseRate)}</span>
          </div>

          {calculation.deposit > 0 && (
            <div className="flex items-center justify-between text-muted">
              <span className="flex items-center gap-1">
                Refundable Deposit
                <Shield className="w-3 h-3 text-muted" />
              </span>
              <span className="font-medium text-text">{formatRupees(calculation.deposit)}</span>
            </div>
          )}

          <div className="border-t border-border pt-2 mt-1 flex items-center justify-between text-[13px] font-semibold text-text">
            <span>Estimated Total</span>
            <span>{formatRupees(calculation.estimatedTotal)}</span>
          </div>

          <span className="text-[10px] text-muted text-right">
            (Includes {formatRupees(calculation.deposit)} refundable deposit)
          </span>
        </div>
      )}

      {/* Request Booking Action Button */}
      <Button
        variant="primary"
        size="lg"
        onClick={handleBookClick}
        disabled={!calculation || calculation.isBelowMin || calculation.isAboveMax}
        className="w-full text-[13px] font-medium"
      >
        Request Booking
        <ArrowRight className="w-4 h-4 ml-1.5" />
      </Button>
    </div>
  );
}
