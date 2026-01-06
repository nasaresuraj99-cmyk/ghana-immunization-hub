import { useState } from "react";
import { 
  BookOpen, 
  UserPlus, 
  Syringe, 
  FileText, 
  Settings, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight,
  Search,
  Download,
  Users,
  AlertTriangle,
  Shield,
  Archive,
  BarChart3,
  Printer,
  Smartphone,
  RefreshCw,
  QrCode,
  Calendar
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

interface ManualSection {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
  keywords: string[];
}

export function UserManualSection() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const manualSections: ManualSection[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <BookOpen className="w-5 h-5" />,
      keywords: ["start", "begin", "introduction", "overview", "login", "signup", "account"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Welcome to the Immunization Tracker</h4>
          <p className="text-muted-foreground">
            This system helps health facilities manage child immunization records efficiently. 
            Follow these steps to get started:
          </p>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium flex items-center gap-2 mb-2">
                <Badge variant="outline">Step 1</Badge> Create an Account
              </h5>
              <p className="text-sm text-muted-foreground">
                Click "Sign Up" on the login page. Enter your name, facility name, email, and password.
                Your facility will be created automatically.
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium flex items-center gap-2 mb-2">
                <Badge variant="outline">Step 2</Badge> Login to Your Account
              </h5>
              <p className="text-sm text-muted-foreground">
                Use your email and password to log in. If you forget your password, 
                click "Forgot Password" to receive a reset link.
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium flex items-center gap-2 mb-2">
                <Badge variant="outline">Step 3</Badge> Navigate the Dashboard
              </h5>
              <p className="text-sm text-muted-foreground">
                The home screen shows key statistics. Use the navigation menu to access 
                different sections: Register, Child Records, Reports, and Settings.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "registration",
      title: "Child Registration",
      icon: <UserPlus className="w-5 h-5" />,
      keywords: ["register", "child", "new", "add", "create", "birth", "caregiver", "mother"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">How to Register a New Child</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">1. Access Registration Form</h5>
              <p className="text-sm text-muted-foreground">
                Click "New Registration" from the home screen or navigate to the Registration section.
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">2. Enter Child Details</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Registration Number:</strong> Auto-generated or enter manually</li>
                <li><strong>Full Name:</strong> Child's full name</li>
                <li><strong>Date of Birth:</strong> Select from calendar</li>
                <li><strong>Sex:</strong> Male or Female</li>
                <li><strong>Caregiver Name:</strong> Parent/guardian name</li>
                <li><strong>Contact:</strong> Phone number or address</li>
                <li><strong>Community:</strong> Child's community/village</li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">3. Submit Registration</h5>
              <p className="text-sm text-muted-foreground">
                Click "Save" to register the child. The system automatically creates a vaccine 
                schedule based on the child's date of birth following the Ghana EPI schedule.
              </p>
            </div>
          </div>
          
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-medium text-amber-800 dark:text-amber-200">Important</h5>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Ensure the date of birth is accurate as it determines vaccine due dates.
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "vaccination",
      title: "Recording Vaccinations",
      icon: <Syringe className="w-5 h-5" />,
      keywords: ["vaccine", "immunization", "administer", "record", "batch", "dose", "injection"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">How to Record Vaccinations</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Individual Vaccination</h5>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>Find the child in the Child Register</li>
                <li>Click the vaccine icon (💉) to open the vaccination modal</li>
                <li>Select the vaccine to administer</li>
                <li>Enter the date given and batch number</li>
                <li>Click "Administer" to save</li>
              </ol>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Bulk/Outreach Vaccination</h5>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>Click "Outreach Session" from the Child Register</li>
                <li>Select the vaccine type and batch number</li>
                <li>Choose the date of the outreach</li>
                <li>Select all eligible children</li>
                <li>Click "Administer to Selected" to record all at once</li>
              </ol>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Editing Vaccine Records</h5>
              <p className="text-sm text-muted-foreground">
                To correct errors, click on a child's profile, go to "Immunization Status", 
                and click on any vaccine to edit its details (date, batch number, status).
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "reports",
      title: "Reports & Analytics",
      icon: <BarChart3 className="w-5 h-5" />,
      keywords: ["report", "export", "pdf", "excel", "analytics", "statistics", "filter", "chart"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Generating Reports</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Available Report Types</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Summary Report:</strong> Overview statistics and age distribution</li>
                <li><strong>Detailed Report:</strong> Individual vaccination records</li>
                <li><strong>Vaccine Coverage:</strong> Coverage rates by vaccine type</li>
                <li><strong>Defaulters Report:</strong> List of children with overdue vaccines</li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Filtering Reports</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Month Filter:</strong> Select specific month for monthly reports</li>
                <li><strong>Date Range:</strong> Set custom start and end dates</li>
                <li><strong>Year Filter:</strong> View yearly data</li>
                <li><strong>Vaccine Type:</strong> Filter by specific vaccines</li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Exporting Reports</h5>
              <div className="flex gap-2 mt-2">
                <Badge variant="outline" className="flex items-center gap-1">
                  <FileText className="w-3 h-3" /> PDF
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Download className="w-3 h-3" /> Excel
                </Badge>
                <Badge variant="outline" className="flex items-center gap-1">
                  <Printer className="w-3 h-3" /> Print
                </Badge>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "certificates",
      title: "Immunization Certificates",
      icon: <FileText className="w-5 h-5" />,
      keywords: ["certificate", "card", "print", "download", "pdf", "immunization", "official"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Generating Certificates</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Individual Certificate</h5>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>Open the child's profile</li>
                <li>Click "View Certificate" or the certificate icon</li>
                <li>Review the certificate preview</li>
                <li>Click "Download PDF" to save</li>
              </ol>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Certificate Contents</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Facility name and district/region</li>
                <li>Child's personal details</li>
                <li>Complete immunization record table</li>
                <li>Vaccination progress indicator</li>
                <li>QR code for verification</li>
                <li>Official health facility authentication</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "defaulters",
      title: "Managing Defaulters",
      icon: <AlertTriangle className="w-5 h-5" />,
      keywords: ["defaulter", "overdue", "missed", "follow-up", "reminder", "tracking"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Tracking Defaulters</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Viewing Defaulters List</h5>
              <p className="text-sm text-muted-foreground">
                Navigate to "Defaulters" from the main menu. The list shows all children 
                with overdue vaccines, sorted by days overdue.
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Severity Indicators</h5>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-destructive"></span>
                  <strong>Critical (&gt;30 days):</strong> Requires immediate attention
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                  <strong>Moderate (14-30 days):</strong> Schedule follow-up soon
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                  <strong>Recent (&lt;14 days):</strong> Recently overdue
                </li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Follow-up Actions</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Export defaulters list for community health workers</li>
                <li>Contact caregivers using listed phone numbers</li>
                <li>Record vaccine when child returns</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "backup",
      title: "Data Backup & Sync",
      icon: <RefreshCw className="w-5 h-5" />,
      keywords: ["backup", "sync", "offline", "data", "restore", "cloud", "export", "import"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Backing Up Your Data</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Automatic Cloud Sync</h5>
              <p className="text-sm text-muted-foreground">
                Your data automatically syncs to the cloud when connected to the internet. 
                The sync indicator in the header shows sync status.
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Offline Mode</h5>
              <p className="text-sm text-muted-foreground">
                The app works offline. Changes are saved locally and sync automatically 
                when you reconnect. Look for the offline indicator at the bottom of the screen.
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Manual Data Export</h5>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>Go to Settings</li>
                <li>Click "Export Data"</li>
                <li>Choose format (JSON for backup, Excel for analysis)</li>
                <li>Save the file securely</li>
              </ol>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Importing Data</h5>
              <p className="text-sm text-muted-foreground">
                To restore data, go to Settings → Import Data and select your backup file.
                The system will merge new records with existing data.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "qr-scanner",
      title: "QR Code Verification",
      icon: <QrCode className="w-5 h-5" />,
      keywords: ["qr", "scan", "verify", "code", "certificate", "barcode"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Using QR Code Scanner</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Scanning Certificates</h5>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>Click the QR icon in the navigation bar</li>
                <li>Allow camera access when prompted</li>
                <li>Point the camera at the QR code on the certificate</li>
                <li>The child's record will be displayed automatically</li>
              </ol>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">QR Code Contains</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Child's registration number</li>
                <li>Facility verification data</li>
                <li>Vaccination summary</li>
                <li>Certificate issue date</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "user-management",
      title: "User Management",
      icon: <Users className="w-5 h-5" />,
      keywords: ["user", "staff", "admin", "role", "permission", "access", "team"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Managing Users (Admin Only)</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">User Roles</h5>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>
                  <strong>Facility Admin:</strong> Full access including user management, 
                  archive, and permanent deletion
                </li>
                <li>
                  <strong>Staff:</strong> Can register children, record vaccines, and 
                  generate reports
                </li>
                <li>
                  <strong>Read Only:</strong> Can view records but cannot make changes
                </li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Adding New Users</h5>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>Go to Settings → User Management</li>
                <li>Share your facility code with new staff</li>
                <li>They sign up and use the code to join</li>
                <li>Assign appropriate role to new user</li>
              </ol>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "archive",
      title: "Archive & Recovery",
      icon: <Archive className="w-5 h-5" />,
      keywords: ["archive", "delete", "restore", "recover", "trash", "remove"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Archive Management</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Archiving Records</h5>
              <p className="text-sm text-muted-foreground">
                When you delete a child record, it moves to the Archive. 
                This is a soft delete that can be reversed.
              </p>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Restoring Records</h5>
              <ol className="text-sm text-muted-foreground list-decimal list-inside space-y-2">
                <li>Go to Settings → Archive</li>
                <li>Find the record to restore</li>
                <li>Click "Restore" button</li>
                <li>Record returns to active list</li>
              </ol>
            </div>
            
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <h5 className="font-medium text-destructive mb-2">Permanent Deletion</h5>
              <p className="text-sm text-destructive/80">
                Only Facility Admins can permanently delete records from the archive. 
                This action cannot be undone.
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "troubleshooting",
      title: "Troubleshooting",
      icon: <HelpCircle className="w-5 h-5" />,
      keywords: ["problem", "error", "issue", "help", "support", "fix", "not working"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Common Issues & Solutions</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Can't Login</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Check your email and password are correct</li>
                <li>Use "Forgot Password" to reset your password</li>
                <li>Clear browser cache and try again</li>
                <li>Check internet connection</li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Data Not Syncing</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Check internet connection</li>
                <li>Look for sync error indicators</li>
                <li>Try refreshing the page</li>
                <li>Log out and log back in</li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">PDF Export Fails</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Allow pop-ups in your browser</li>
                <li>Check download permissions</li>
                <li>Try a different browser</li>
                <li>Reduce the date range for large reports</li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">App Not Loading</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Clear browser cache and cookies</li>
                <li>Try incognito/private browsing mode</li>
                <li>Update your browser to latest version</li>
                <li>Check if JavaScript is enabled</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-primary/10 border border-primary/30 rounded-lg p-4">
            <h5 className="font-medium text-primary mb-2">Need More Help?</h5>
            <p className="text-sm text-muted-foreground">
              Contact your facility administrator or the Ghana Health Service IT support 
              for additional assistance.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "mobile-app",
      title: "Mobile App Usage",
      icon: <Smartphone className="w-5 h-5" />,
      keywords: ["mobile", "phone", "install", "pwa", "app", "android", "ios", "iphone"],
      content: (
        <div className="space-y-4">
          <h4 className="font-semibold text-foreground">Using on Mobile Devices</h4>
          
          <div className="space-y-3">
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Installing as App</h5>
              <p className="text-sm text-muted-foreground mb-2">
                This is a Progressive Web App (PWA) that can be installed on your device:
              </p>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li><strong>Android:</strong> Tap "Add to Home Screen" when prompted</li>
                <li><strong>iOS:</strong> Tap Share → "Add to Home Screen"</li>
                <li><strong>Desktop:</strong> Click the install icon in the address bar</li>
              </ul>
            </div>
            
            <div className="bg-muted/50 rounded-lg p-4">
              <h5 className="font-medium mb-2">Mobile Features</h5>
              <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                <li>Works offline - syncs when connected</li>
                <li>Use bottom navigation for quick access</li>
                <li>Camera QR scanning for verification</li>
                <li>Touch-optimized interface</li>
              </ul>
            </div>
          </div>
        </div>
      ),
    },
  ];

  // Filter sections based on search
  const filteredSections = manualSections.filter(section => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      section.title.toLowerCase().includes(query) ||
      section.keywords.some(k => k.toLowerCase().includes(query))
    );
  });

  return (
    <div className="animate-fade-in">
      <div className="bg-card rounded-lg p-6 shadow-elevation-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-primary/10 rounded-lg">
            <BookOpen className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">User Manual & Help</h2>
            <p className="text-sm text-muted-foreground">
              Step-by-step guide for using the Immunization Tracker
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {manualSections.slice(0, 4).map((section) => (
            <Button
              key={section.id}
              variant="outline"
              className="h-auto py-3 flex flex-col items-center gap-2"
              onClick={() => {
                setExpandedSections([section.id]);
                document.getElementById(section.id)?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {section.icon}
              <span className="text-xs">{section.title}</span>
            </Button>
          ))}
        </div>

        {/* Manual Content */}
        <Accordion 
          type="multiple" 
          value={expandedSections}
          onValueChange={setExpandedSections}
          className="space-y-3"
        >
          {filteredSections.map((section) => (
            <AccordionItem 
              key={section.id} 
              value={section.id}
              id={section.id}
              className="border rounded-lg px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    {section.icon}
                  </div>
                  <span className="font-medium">{section.title}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-4">
                {section.content}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {filteredSections.length === 0 && (
          <div className="text-center py-12">
            <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No topics found</h3>
            <p className="text-sm text-muted-foreground">
              Try different search terms or browse all topics above.
            </p>
          </div>
        )}

        {/* Support Footer */}
        <div className="mt-8 pt-6 border-t">
          <div className="bg-muted/50 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h4 className="font-medium">Ghana Health Service Support</h4>
                <p className="text-sm text-muted-foreground">
                  For technical assistance, contact your facility IT support
                </p>
              </div>
            </div>
            <Badge variant="outline" className="text-sm">
              Version 2.0.0
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}
