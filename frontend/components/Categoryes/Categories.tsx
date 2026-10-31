"use client"

import { useEffect } from "react"
import { useAppDispatch, useAppSelector } from "@/stores"
import { getFirstCategory } from "@/stores/slices/category.slice"

import { CategoryButton } from "@/components/Categoryes/CategoryButton"
import { ICategoriesProps } from "@/components/Categoryes/ICategoriesProps"

export const Categories = ({ className, ...props }: ICategoriesProps) => {
  const dispatch = useAppDispatch()
  useEffect(() => {
    dispatch(getFirstCategory())
  }, [dispatch])
  const category = useAppSelector((state) => state.category.category)
  return (
    <div className={"space-y-5 py-5 border-b  border-r-0"}>
      <h1>Категории</h1>
      {category.map((c) => (
        <CategoryButton
          key={c.alias}
          secondLevelCategory={c.secondLevelCategory}
          name={c.name}
          alias={c.alias}
        />
      ))}
    </div>
  )
}
