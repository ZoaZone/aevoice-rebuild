import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PLATFORMS = {
  wordpress: {
    label: "WordPress",
    steps: [
      "Go to Appearance → Theme Editor (or use \"Insert Headers and Footers\" plugin)",
      "Edit footer.php or use the plugin's footer section",
      "Paste the embed code before </body>",
      "Save changes and verify on your site",
    ],
  },
  shopify: {
    label: "Shopify",
    steps: [
      "Go to Online Store → Themes → Actions → Edit Code",
      "Open the theme.liquid file",
      "Paste the embed code just before </body>",
      "Save and preview your storefront",
    ],
  },
  wix: {
    label: "Wix",
    steps: [
      "Go to Settings → Custom Code",
      'Click "+ Add Custom Code"',
      "Paste the embed code",
      'Select "Body - End" placement → Apply',
    ],
  },
  squarespace: {
    label: "Squarespace",
    steps: [
      "Go to Settings → Advanced → Code Injection",
      'Paste the snippet into the "Footer" section',
      "Click Save",
    ],
  },
  nextjs: {
    label: "Next.js / React",
    steps: [
      "Add the <script> tags inside your _document.js or layout component",
      "Or place the config + loader in a useEffect hook",
      "Ensure the script loads after DOM is ready",
      "Deploy and verify",
    ],
  },
  html: {
    label: "Custom HTML",
    steps: [
      "Open your website's main HTML file",
      "Paste the embed code before the closing </body> tag",
      "Upload / deploy the updated file",
      "Test the widget on your live site",
    ],
  },
};

export default function PlatformInstructions() {
  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle>Platform-Specific Instructions</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="wordpress">
          <TabsList className="flex-wrap h-auto gap-1">
            {Object.entries(PLATFORMS).map(([key, p]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                {p.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {Object.entries(PLATFORMS).map(([key, p]) => (
            <TabsContent key={key} value={key} className="space-y-2 text-sm mt-3">
              {p.steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs font-bold">
                    {i + 1}
                  </div>
                  <p className="text-slate-700 pt-0.5">{step}</p>
                </div>
              ))}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}