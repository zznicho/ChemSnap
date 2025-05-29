import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const elements = [
  { symbol: 'H', name: 'Hydrogen', atomic_number: 1, group: 1, period: 1, color: 'bg-blue-200' },
  { symbol: 'He', name: 'Helium', atomic_number: 2, group: 18, period: 1, color: 'bg-purple-200' },
  { symbol: 'Li', name: 'Lithium', atomic_number: 3, group: 1, period: 2, color: 'bg-red-200' },
  { symbol: 'Be', name: 'Beryllium', atomic_number: 4, group: 2, period: 2, color: 'bg-green-200' },
  { symbol: 'B', name: 'Boron', atomic_number: 5, group: 13, period: 2, color: 'bg-yellow-200' },
  { symbol: 'C', name: 'Carbon', atomic_number: 6, group: 14, period: 2, color: 'bg-gray-200' },
  { symbol: 'N', name: 'Nitrogen', atomic_number: 7, group: 15, period: 2, color: 'bg-blue-300' },
  { symbol: 'O', name: 'Oxygen', atomic_number: 8, group: 16, period: 2, color: 'bg-red-300' },
  { symbol: 'F', name: 'Fluorine', atomic_number: 9, group: 17, period: 2, color: 'bg-green-300' },
  { symbol: 'Ne', name: 'Neon', atomic_number: 10, group: 18, period: 2, color: 'bg-purple-300' },
  { symbol: 'Na', name: 'Sodium', atomic_number: 11, group: 1, period: 3, color: 'bg-red-200' },
  { symbol: 'Mg', name: 'Magnesium', atomic_number: 12, group: 2, period: 3, color: 'bg-green-200' },
  { symbol: 'Al', name: 'Aluminum', atomic_number: 13, group: 13, period: 3, color: 'bg-yellow-200' },
  { symbol: 'Si', name: 'Silicon', atomic_number: 14, group: 14, period: 3, color: 'bg-gray-200' },
  { symbol: 'P', name: 'Phosphorus', atomic_number: 15, group: 15, period: 3, color: 'bg-blue-300' },
  { symbol: 'S', name: 'Sulfur', atomic_number: 16, group: 16, period: 3, color: 'bg-red-300' },
  { symbol: 'Cl', name: 'Chlorine', atomic_number: 17, group: 17, period: 3, color: 'bg-green-300' },
  { symbol: 'Ar', name: 'Argon', atomic_number: 18, group: 18, period: 3, color: 'bg-purple-300' },
];

const PeriodicTable = () => {
  return (
    <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Periodic Table of Elements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-18 gap-1 text-xs md:text-sm">
          {/* Empty cells for alignment */}
          {Array(18).fill(null).map((_, i) => (
            <div key={`header-${i}`} className="text-center font-bold text-gray-600 dark:text-gray-400">{i + 1}</div>
          ))}
          {/* Period 1 */}
          <div className="text-center font-bold text-gray-600 dark:text-gray-400">1</div>
          {elements.filter(e => e.period === 1).sort((a, b) => a.group - b.group).map(element => (
            <div
              key={element.symbol}
              className={`p-1 border border-gray-300 dark:border-gray-600 rounded flex flex-col items-center justify-center ${element.color} text-gray-900 dark:text-gray-900`}
              style={{ gridColumn: element.group }}
            >
              <span className="font-bold">{element.atomic_number}</span>
              <span className="font-bold text-lg">{element.symbol}</span>
              <span className="text-xs text-center">{element.name}</span>
            </div>
          ))}
          {/* Period 2 */}
          <div className="text-center font-bold text-gray-600 dark:text-gray-400">2</div>
          {elements.filter(e => e.period === 2).sort((a, b) => a.group - b.group).map(element => (
            <div
              key={element.symbol}
              className={`p-1 border border-gray-300 dark:border-gray-600 rounded flex flex-col items-center justify-center ${element.color} text-gray-900 dark:text-gray-900`}
              style={{ gridColumn: element.group }}
            >
              <span className="font-bold">{element.atomic_number}</span>
              <span className="font-bold text-lg">{element.symbol}</span>
              <span className="text-xs text-center">{element.name}</span>
            </div>
          ))}
          {/* Period 3 */}
          <div className="text-center font-bold text-gray-600 dark:text-gray-400">3</div>
          {elements.filter(e => e.period === 3).sort((a, b) => a.group - b.group).map(element => (
            <div
              key={element.symbol}
              className={`p-1 border border-gray-300 dark:border-gray-600 rounded flex flex-col items-center justify-center ${element.color} text-gray-900 dark:text-gray-900`}
              style={{ gridColumn: element.group }}
            >
              <span className="font-bold">{element.atomic_number}</span>
              <span className="font-bold text-lg">{element.symbol}</span>
              <span className="text-xs text-center">{element.name}</span>
            </div>
          ))}
          {/* Note: This is a simplified table. For a full table, more elements and complex grid positioning would be needed. */}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 text-center">
          This is a simplified periodic table for quick reference.
        </p>
      </CardContent>
    </Card>
  );
};

export default PeriodicTable;