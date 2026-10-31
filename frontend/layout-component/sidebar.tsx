"use client"

import {
  DetailedHTMLProps,
  HTMLAttributes,
  useEffect,
  useState,
} from "react"
import {usePathname} from "next/navigation"
import { motion, useReducedMotion } from "framer-motion"

import { cn } from "@/lib/utils"
import { Categories } from "@/components/Categoryes/Categories"
import { PopularTags } from "@/components/Header/PopularTags"
import { ButtonIcon } from "@/components/buttonIcon/ButtonIcon"
import styles from "@/components/buttonIcon/ButtonIcon.module.css"
import {useWidthScreen} from "@/hooks/useWidthScreen";

interface LeftSiteProps
  extends DetailedHTMLProps<
    HTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  > {}
export const LeftSite = ({ className }: LeftSiteProps) => {
  const pathName = usePathname();
  const widthScreen = useWidthScreen();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const useSlowMotion = useReducedMotion();
  useEffect(() => {
    if(widthScreen<766) {
      setIsOpen(false)
    }
    if(widthScreen>766) {
      setIsOpen(true);
    }
    console.log('widthscreen' + widthScreen);
  }, [pathName, widthScreen])
  const variants = {
    opened: {
      opacity: 1,
      x: 0,
      transition: {
        stiffness: 20,
      },
    },
    closed: {
      opacity: useSlowMotion ? 1 : 0,
      x: "-100%",
    },
  }
  // const handleAnimationComplete = () => {
  //   if (!isOpen) setIsOpen(true);
  // };
  // , isOpen && " block ", styles.LeftSide
  console.log(isOpen)
  return (
    <div className={cn(className,"")}>
      <ButtonIcon
        appearance={"white"}
        className={"fixed my-20  w-24 z-40   " + styles.MenuButtin}
        icon={"IconMenu"}
        aria-label="??????? ?????????"
        onClick={() => {
          setIsOpen((o) => !o)
        }}
      />
      <motion.div
        className={
          "w-48 fixed border-b  bg-background h-full px-2  top-16 z-50  pr-2 border-r " +
          styles.leftSideMargin
        }
        variants={variants}
        initial={false}
        animate={isOpen ? "opened" : "closed"}
      >
        <ButtonIcon
          appearance={"white"}
          className={"absolute right-0  w-24 z-50   " + styles.MenuButtin}
          icon={"IconClose"}
          aria-label="??????? ?????????"
          onClick={() => {
            setIsOpen((o) => !o)
          }}
        />
        <Categories />
        <PopularTags />
      </motion.div>
    </div>
  )
}
