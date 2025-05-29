import { MadeWithDyad } from "@/components/made-with-dyad";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Camera, Video, Send } from "lucide-react";
import Layout from "@/components/Layout";

const Home = () => {
  return (
    <Layout>
      <div className="container mx-auto p-4 pt-16 md:pt-4">
        <h1 className="text-3xl font-bold mb-6 text-center">ChemSnap! Feed</h1>

        {/* Post Creation Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Create New Post</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea placeholder="What's on your mind, Chemist?" className="mb-4" />
            <div className="flex justify-between items-center">
              <div className="flex space-x-2">
                <Button variant="outline" size="icon">
                  <Camera className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Video className="h-4 w-4" />
                </Button>
              </div>
              <Button>
                <Send className="h-4 w-4 mr-2" /> Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Placeholder for Posts */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User 1</CardTitle>
              <p className="text-sm text-muted-foreground">2 hours ago</p>
            </CardHeader>
            <CardContent>
              <p>Just finished studying organic chemistry! So many reactions to remember.</p>
              <div className="flex items-center space-x-4 mt-4 text-muted-foreground">
                <span>❤️ 15 Likes</span>
                <span>💬 3 Comments</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Teacher Smith</CardTitle>
              <p className="text-sm text-muted-foreground">Yesterday</p>
            </CardHeader>
            <CardContent>
              <img src="https://via.placeholder.com/400x200?text=Chemistry+Lab" alt="Chemistry Lab" className="rounded-md mb-4" />
              <p>Excited about our upcoming lab session on titration! Remember to review the safety guidelines.</p>
              <div className="flex items-center space-x-4 mt-4 text-muted-foreground">
                <span>❤️ 28 Likes</span>
                <span>💬 7 Comments</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Student A</CardTitle>
              <p className="text-sm text-muted-foreground">3 days ago</p>
            </CardHeader>
            <CardContent>
              <video controls src="https://www.w3schools.com/html/mov_bbb.mp4" className="rounded-md mb-4 w-full h-auto max-h-64 object-cover"></video>
              <p>Quick video explaining the basics of stoichiometry! Hope this helps someone.</p>
              <div className="flex items-center space-x-4 mt-4 text-muted-foreground">
                <span>❤️ 42 Likes</span>
                <span>💬 12 Comments</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      <MadeWithDyad />
    </Layout>
  );
};

export default Home;