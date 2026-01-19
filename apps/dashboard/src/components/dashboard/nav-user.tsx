'use client';
import { useClerk, useUser } from '@clerk/nextjs';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '../ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  ChevronsUpDown,
  Github,
  LogOut,
  Monitor,
  Moon,
  Sun,
  SunMoon,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { env } from '@repo/env/dashboard';
import { useTheme } from 'next-themes';

const UserView = ({
  user,
  identifier,
}: {
  user: ReturnType<typeof useUser>['user'];
  identifier: string;
}) => (
  <>
    <Avatar className="size-8 rounded-lg">
      <AvatarImage src={user?.imageUrl} alt={identifier} />
      <AvatarFallback className="rounded-lg">
        {identifier.charAt(0)}
      </AvatarFallback>
    </Avatar>
    <div className="grid flex-1 text-left text-sm leading-tight">
      <span className="truncate font-medium">{identifier}</span>
      <span className="truncate text-xs">
        {user?.emailAddresses[0]?.emailAddress}
      </span>
    </div>
  </>
);

export function DashboardNavUser() {
  const { user, openUserProfile, signOut } = useClerk();
  const { isMobile } = useSidebar();
  const { setTheme } = useTheme();

  const identifier =
    user?.firstName ||
    user?.username ||
    user?.emailAddresses[0]?.emailAddress ||
    'User';

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <UserView user={user} identifier={identifier} />
            <ChevronsUpDown className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-56 rounded-lg"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="text-foreground flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <UserView user={user} identifier={identifier} />
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => openUserProfile()}>
                <User />
                Profile
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <SunMoon />
                  Theme
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme('system')}>
                      <Monitor />
                      System
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('light')}>
                      <Sun />
                      Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')}>
                      <Moon />
                      Dark
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem
                render={
                  <Link href={env.NEXT_PUBLIC_REPOSITORY_URL} target="_blank" />
                }
              >
                <Github />
                Source Code
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => signOut()}>
                <LogOut />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
