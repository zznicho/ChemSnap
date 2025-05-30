import React from 'react';
    import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
    import { ExternalLink } from "lucide-react";

    const formulaSheets = [
      { name: "Common Chemistry Formulas", url: "#" },
      { name: "Solubility Rules Chart", url: "#" },
      { name: "Polyatomic Ions List", url: "#" },
      { name: "Thermodynamics Equations", url: "#" },
      { name: "New Chemistry Formula Sheet", url: "https://example.com/new-formula-sheet.pdf" }, // Added new link
    ];

    const FormulaSheets = () => {
      return (
        <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
          <CardHeader>
            <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Chemistry Formula & Value Sheets</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {formulaSheets.map((sheet, index) => (
                <li key={index}>
                  <a
                    href={sheet.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-blue-600 hover:underline dark:text-blue-400 text-base"
                  >
                    {sheet.name} <ExternalLink className="ml-1 h-4 w-4" />
                  </a>
                </li>
              ))}
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4">
              (Note: Links are placeholders. Actual content will be added here.)
            </p>
          </CardContent>
        </Card>
      );
    };

    export default FormulaSheets;