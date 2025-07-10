import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ChevronRight } from 'lucide-react';
import { NavLink, useLocation } from 'react-router';

export function SiteHeader() {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium">
          <Breadcrumbs />
        </h1>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" asChild size="sm" className="hidden sm:flex">
            <a
              href="https://github.com/RaccoonCode96/visualwright"
              rel="noopener noreferrer"
              target="_blank"
              className="dark:text-foreground"
            >
              GitHub
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

function Breadcrumbs() {
  const location = useLocation();

  const crumbs = location.pathname.split('/').filter((x) => x);

  return (
    <ol className="flex items-center gap-2 ">
      {crumbs.map((crumb, index) => (
        <>
          <NavLink to={crumbs.slice(0, index + 1).join('/')} key={`crumb-${index}`}>
            <li>{crumb}</li>
          </NavLink>
          {index !== crumbs.length - 1 && <ChevronRight size={'1em'} />}
        </>
      ))}
    </ol>
  );
}
