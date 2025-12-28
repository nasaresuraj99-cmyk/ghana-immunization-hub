import { User, Phone, Mail, MapPin } from "lucide-react";

export function DeveloperCredits() {
  return (
    <div className="bg-card border-t border-border mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <User className="w-3.5 h-3.5" />
            <span>Developed By: NASARE SURAJ</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5" />
            <a href="tel:0248337838" className="hover:text-primary transition-colors">
              0248337838
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5" />
            <a href="mailto:nasaresuraj994@gmail.com" className="hover:text-primary transition-colors">
              nasaresuraj994@gmail.com
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            <span>BBI – Fian, Upper West Region</span>
          </div>
        </div>
      </div>
    </div>
  );
}
