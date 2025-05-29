import Layout from "@/components/Layout";

const Calendar = () => {
  return (
    <Layout>
      <div className="container mx-auto p-4 pt-16 md:pt-4">
        <h1 className="text-3xl font-bold mb-6 text-center">Calendar</h1>
        <p className="text-center text-muted-foreground">
          Manage your personal and class events here! Calendar features coming soon.
        </p>
      </div>
    </Layout>
  );
};

export default Calendar;