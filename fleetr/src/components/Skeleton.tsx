/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: 'rect' | 'circle' | 'text' | 'button';
}

/**
 * Core shimmering Skeleton building block with smooth gradient sweep for low-connectivity environments
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rect',
  ...props
}) => {
  const variantStyles = {
    rect: 'rounded-md',
    circle: 'rounded-full',
    text: 'rounded h-3.5 w-full',
    button: 'rounded-lg h-9 w-24'
  };

  return (
    <div
      aria-hidden="true"
      className={`bg-slate-200/80 skeleton-shimmer animate-pulse ${variantStyles[variant]} ${className}`}
      {...props}
    />
  );
};

/**
 * Metric KPI Cards Skeleton (e.g., Active Shipments, Pending Bills, Turnover)
 */
export const MetricCardsSkeleton: React.FC<{ count?: number }> = ({ count = 5 }) => {
  const borderAccents = [
    'border-l-slate-400',
    'border-l-amber-400',
    'border-l-sky-400',
    'border-l-emerald-400',
    'border-l-blue-400'
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 w-full">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs border-l-4 ${borderAccents[i % borderAccents.length]} space-y-3 ${
            i === count - 1 && count % 2 !== 0 ? 'sm:col-span-2 lg:col-span-1' : ''
          }`}
        >
          <div className="flex justify-between items-center">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-2 w-8" />
          </div>
          <div className="flex justify-between items-center pt-1">
            <Skeleton className="h-7 w-20" />
            <Skeleton variant="circle" className="w-8 h-8" />
          </div>
          <Skeleton className="h-2 w-16" />
        </div>
      ))}
    </div>
  );
};

/**
 * Dashboard Table Skeleton with structured columns, headers, and rows
 */
export interface TableSkeletonProps {
  headers?: string[];
  columnCount?: number;
  rowCount?: number;
  title?: string;
  showSearch?: boolean;
}

export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  headers = ['Consignment ID', 'Goods Description', 'Urgency', 'Weight (KG)', 'Route Log', 'Status', 'Actions'],
  rowCount = 5,
  title,
  showSearch = false
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
      {/* Header bar */}
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-2 bg-slate-50/60">
        <div className="flex items-center gap-2">
          {title ? (
            <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">{title}</span>
          ) : (
            <Skeleton className="h-4 w-36" />
          )}
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-medium text-slate-500 bg-slate-100">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
            Syncing data...
          </span>
        </div>
        <div className="flex items-center gap-2">
          {showSearch && <Skeleton className="h-8 w-32 hidden sm:block" />}
          <Skeleton className="h-8 w-20" />
        </div>
      </div>

      {/* Responsive table container */}
      <div className="w-full overflow-x-auto -mx-0.5 sm:mx-0">
        <table className="w-full text-xs text-left min-w-[640px]">
          <thead className="bg-[#f8fafc] text-slate-400 font-mono text-[10px] uppercase tracking-wider border-b border-slate-200">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-4 sm:px-5 py-3 ${
                    i === headers.length - 1 ? 'text-right' : i === 0 ? 'text-left' : ''
                  }`}
                >
                  <span className="opacity-80">{h}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rowCount }).map((_, rIdx) => (
              <tr key={rIdx} className="hover:bg-slate-50/30 transition-colors">
                {headers.map((_, cIdx) => {
                  const isFirst = cIdx === 0;
                  const isLast = cIdx === headers.length - 1;
                  const isSecond = cIdx === 1;
                  const isStatus = cIdx === headers.length - 2;

                  if (isFirst) {
                    return (
                      <td key={cIdx} className="px-4 sm:px-5 py-3.5">
                        <Skeleton className="h-3.5 w-24 font-mono" />
                      </td>
                    );
                  }
                  if (isSecond) {
                    return (
                      <td key={cIdx} className="px-4 sm:px-5 py-3.5 space-y-1.5">
                        <Skeleton className="h-3.5 w-36" />
                        <Skeleton className="h-2.5 w-20" />
                      </td>
                    );
                  }
                  if (isStatus) {
                    return (
                      <td key={cIdx} className="px-4 sm:px-5 py-3.5">
                        <Skeleton className="h-5 w-20 rounded-md" />
                      </td>
                    );
                  }
                  if (isLast) {
                    return (
                      <td key={cIdx} className="px-4 sm:px-5 py-3.5 text-right">
                        <div className="flex justify-end">
                          <Skeleton className="h-8 w-18 rounded-lg" />
                        </div>
                      </td>
                    );
                  }
                  return (
                    <td key={cIdx} className="px-4 sm:px-5 py-3.5">
                      <Skeleton className="h-3.5 w-24" />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Footer bar */}
      <div className="px-4 py-2.5 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-6 w-36 rounded-md" />
      </div>
    </div>
  );
};

/**
 * List Cards Skeleton for Fleet vehicles, Drivers, Godown Structures
 */
export const ListCardSkeleton: React.FC<{ count?: number; showProgress?: boolean; title?: string }> = ({
  count = 3,
  showProgress = false,
  title
}) => {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden w-full">
      <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100 flex justify-between items-center bg-slate-50/60">
        {title ? (
          <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">{title}</span>
        ) : (
          <Skeleton className="h-4 w-32" />
        )}
        <Skeleton className="h-5 w-16 rounded-md" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="p-4 space-y-3">
            <div className="flex justify-between items-start gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Skeleton variant="rect" className="w-10 h-10 rounded-lg shrink-0" />
                <div className="space-y-1.5 flex-1 min-w-0">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-2.5 w-48 max-w-full" />
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Skeleton className="h-6 w-20 rounded" />
                <Skeleton className="h-8 w-24 rounded-lg hidden sm:block" />
              </div>
            </div>
            {showProgress && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-2.5 w-24" />
                  <Skeleton className="h-2.5 w-8" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
                <div className="flex justify-between items-center">
                  <Skeleton className="h-2 w-16" />
                  <Skeleton className="h-2 w-16" />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Grid Cards Skeleton for Task & Consignment Boards (Godown Tasks, Carrier Assignments)
 */
export const GridCardSkeleton: React.FC<{ count?: number; columns?: '2' | '3'; title?: string }> = ({
  count = 4,
  columns = '2',
  title
}) => {
  const gridClasses = columns === '3' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  return (
    <div className="bg-white p-3.5 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 w-full">
      <div className="border-b border-slate-100 pb-2.5 flex justify-between items-center">
        {title ? (
          <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">{title}</span>
        ) : (
          <Skeleton className="h-4 w-36" />
        )}
        <Skeleton className="h-4 w-24" />
      </div>

      <div className={gridClasses}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
            <div className="flex justify-between items-start gap-2">
              <div className="space-y-1 flex-1">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-4 w-40" />
              </div>
              <Skeleton className="h-5 w-16 rounded" />
            </div>

            <div className="bg-slate-50/80 rounded-lg p-2.5 space-y-2 border border-slate-100">
              <div className="flex justify-between items-center">
                <Skeleton className="h-2.5 w-24" />
                <Skeleton className="h-2.5 w-16" />
              </div>
              <div className="flex justify-between items-center">
                <Skeleton className="h-2.5 w-20" />
                <Skeleton className="h-2.5 w-32" />
              </div>
            </div>

            <div className="flex justify-between items-center pt-1">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Chart Box Skeleton with simulated axes and shimmers
 */
export const ChartSkeleton: React.FC<{ title?: string; height?: string }> = ({
  title = 'Data Analytics Profile',
  height = 'h-64'
}) => {
  return (
    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 w-full">
      <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">{title}</span>
        <Skeleton className="h-3 w-16" />
      </div>

      <div className={`${height} w-full flex flex-col justify-end p-2 bg-slate-50/40 rounded-lg relative overflow-hidden border border-slate-100`}>
        {/* Subtle grid lines */}
        <div className="absolute inset-0 flex flex-col justify-between p-4 pointer-events-none opacity-40">
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
          <div className="border-b border-dashed border-slate-200 w-full" />
        </div>

        {/* Faux bar/chart pillars */}
        <div className="flex items-end justify-around h-4/5 w-full z-10 px-2 gap-2">
          <Skeleton className="w-1/8 h-1/3 rounded-t-sm" />
          <Skeleton className="w-1/8 h-2/3 rounded-t-sm" />
          <Skeleton className="w-1/8 h-1/2 rounded-t-sm" />
          <Skeleton className="w-1/8 h-4/5 rounded-t-sm" />
          <Skeleton className="w-1/8 h-3/5 rounded-t-sm" />
          <Skeleton className="w-1/8 h-2/5 rounded-t-sm" />
        </div>

        {/* Axis line */}
        <div className="h-1 w-full bg-slate-200 mt-2 rounded" />
      </div>
    </div>
  );
};
