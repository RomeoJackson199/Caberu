import React from "react";
import { Link } from "react-router-dom";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <div className={cn("mb-3 md:mb-4", className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((bc, idx) => (
              <React.Fragment key={idx}>
                <BreadcrumbItem>
                  {bc.href ? (
                    <BreadcrumbLink asChild>
                      <Link to={bc.href}>{bc.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{bc.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {idx < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </React.Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="mt-2 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[var(--title-size)] leading-[var(--title-line)] font-semibold tracking-tight">{title}</h1>
          {subtitle && (
            <p className="text-muted-foreground text-[var(--subtitle-size)] leading-[var(--subtitle-line)] font-[var(--subtitle-weight)]">{subtitle}</p>
          )}
        </div>
        {actions && (
          <div className="flex-shrink-0 flex items-center gap-2">{actions}</div>
        )}
      </div>
    </div>
  );
}

export default PageHeader;

