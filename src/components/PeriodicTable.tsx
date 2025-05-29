import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { periodicElements, ElementData } from "@/data/periodicElements";

const PeriodicTable = () => {
  const [selectedElement, setSelectedElement] = useState<ElementData | null>(null);

  const getCategoryColorClass = (category: string) => {
    switch (category) {
      case 'alkali-metal': return 'bg-elements-alkali-metal';
      case 'alkaline-earth-metal': return 'bg-elements-alkaline-earth-metal';
      case 'transition-metal': return 'bg-elements-transition-metal';
      case 'post-transition-metal': return 'bg-elements-post-transition-metal';
      case 'metalloid': return 'bg-elements-metalloid';
      case 'nonmetal': return 'bg-elements-nonmetal';
      case 'halogen': return 'bg-elements-halogen';
      case 'noble-gas': return 'bg-elements-noble-gas';
      case 'lanthanide': return 'bg-elements-lanthanide';
      case 'actinide': return 'bg-elements-actinide';
      default: return 'bg-gray-200 dark:bg-gray-600'; // Default fallback
    }
  };

  return (
    <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Full Periodic Table of Elements</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-18 gap-0.5 text-xs md:text-sm overflow-x-auto">
          {/* Column Headers (Groups) */}
          {Array.from({ length: 18 }, (_, i) => (
            <div key={`group-header-${i + 1}`} className="text-center font-bold text-gray-600 dark:text-gray-400 p-1">
              {i + 1}
            </div>
          ))}

          {/* Period Headers and Elements */}
          {Array.from({ length: 9 }, (_, periodIndex) => {
            const periodNum = periodIndex + 1;
            return (
              <React.Fragment key={`period-row-${periodNum}`}>
                {/* Period Number */}
                <div className="text-center font-bold text-gray-600 dark:text-gray-400 p-1" style={{ gridColumn: 1, gridRow: periodNum + 1 }}>
                  {periodNum}
                </div>
                {/* Elements for this period */}
                {periodicElements
                  .filter(e => e.ypos === periodNum)
                  .map(element => (
                    <div
                      key={element.symbol}
                      className={`p-1 border border-gray-300 dark:border-gray-600 rounded flex flex-col items-center justify-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-100
                        ${getCategoryColorClass(element.category)}
                        ${selectedElement?.atomic_number === element.atomic_number ? 'ring-2 ring-blue-500' : ''}
                      `}
                      style={{ gridColumn: element.xpos, gridRow: element.ypos + 1 }}
                      onClick={() => setSelectedElement(element)}
                    >
                      <span className="font-bold text-gray-900 dark:text-gray-900">{element.atomic_number}</span>
                      <span className="font-bold text-lg text-gray-900 dark:text-gray-900">{element.symbol}</span>
                      <span className="text-xs text-center text-gray-800 dark:text-gray-800">{element.name}</span>
                    </div>
                  ))}
                {/* Placeholder for Lanthanides/Actinides in main table */}
                {(periodNum === 6 || periodNum === 7) && (
                  <div
                    className="p-1 border border-gray-300 dark:border-gray-600 rounded flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all duration-100"
                    style={{ gridColumn: 3, gridRow: periodNum + 1 }}
                    onClick={() => setSelectedElement(null)} // Clear selection if clicking placeholder
                  >
                    {periodNum === 6 ? '57-71' : '89-103'}
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Element Details Display */}
        {selectedElement && (
          <Card className="mt-6 p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
            <CardHeader className="p-0 pb-2">
              <CardTitle className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {selectedElement.name} ({selectedElement.symbol})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 text-gray-800 dark:text-gray-200">
              <p><strong>Atomic Number:</strong> {selectedElement.atomic_number}</p>
              <p><strong>Atomic Weight:</strong> {selectedElement.atomic_weight.toFixed(4)}</p>
              <p><strong>Category:</strong> <span className="capitalize">{selectedElement.category.replace(/-/g, ' ')}</span></p>
              <p><strong>Period:</strong> {selectedElement.period}</p>
              {selectedElement.group && <p><strong>Group:</strong> {selectedElement.group}</p>}
            </CardContent>
          </Card>
        )}

        {/* Color Legend */}
        <div className="mt-6 p-4 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-700">
          <h3 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-3">Element Categories:</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-sm">
            {Object.entries({
              'alkali-metal': 'Alkali Metals',
              'alkaline-earth-metal': 'Alkaline Earth Metals',
              'transition-metal': 'Transition Metals',
              'post-transition-metal': 'Post-Transition Metals',
              'metalloid': 'Metalloids',
              'nonmetal': 'Nonmetals',
              'halogen': 'Halogens',
              'noble-gas': 'Noble Gases',
              'lanthanide': 'Lanthanides',
              'actinide': 'Actinides',
            }).map(([category, label]) => (
              <div key={category} className="flex items-center">
                <span className={`w-4 h-4 rounded-sm mr-2 ${getCategoryColorClass(category)}`}></span>
                <span className="text-gray-800 dark:text-gray-200">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PeriodicTable;