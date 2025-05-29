import PeriodicTable from "@/components/PeriodicTable";
import FormulaSheets from "@/components/FormulaSheets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Resources = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col items-center p-4 pb-20">
      <div className="w-full max-w-3xl">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-gray-100">Chemistry Resources Hub</h1>
        <p className="text-center text-gray-600 dark:text-gray-400 mb-8">
          Your comprehensive guide for chemistry studies, from fundamental concepts to career paths.
        </p>

        <div className="space-y-8">
          <PeriodicTable />
          <FormulaSheets />

          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Past Papers & Textbooks</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800 dark:text-gray-200 mb-2">
                Access a collection of past examination papers and recommended textbooks to aid your revision.
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                <li>HSC Chemistry Past Papers (Coming Soon)</li>
                <li>Recommended University Chemistry Textbooks (Coming Soon)</li>
                <li>Interactive Study Guides (Coming Soon)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">University Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800 dark:text-gray-200 mb-2">
                Find information about chemistry programs, admission requirements, and student life at various universities.
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                <li>University Course Guides (Coming Soon)</li>
                <li>Scholarship Opportunities (Coming Soon)</li>
                <li>Student Testimonials (Coming Soon)</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">Fields That Require Chemistry</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-800 dark:text-gray-200 mb-2">
                Explore diverse career paths and industries where a strong foundation in chemistry is essential.
              </p>
              <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                <li>Medicine & Healthcare (Coming Soon)</li>
                <li>Environmental Science (Coming Soon)</li>
                <li>Forensic Science (Coming Soon)</li>
                <li>Chemical Engineering (Coming Soon)</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Resources;