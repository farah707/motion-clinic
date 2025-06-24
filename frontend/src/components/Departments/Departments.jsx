import React from "react";
import Carousel from "react-multi-carousel";
import "react-multi-carousel/lib/styles.css";
import "./Department.css";
import { useTranslation } from "react-i18next";

const Departments = () => {
  const { t } = useTranslation();

  const departmentsArray = [
    {
      name: t("department_orthopedics"),
      imageUrl: "/departments/ortho.jpg",
    },
    {
      name: t("department_physical_therapy"),
      imageUrl: "/departments/therapy.jpg",
    },
  ];

  const responsive = {
    extraLarge: {
      breakpoint: { max: 3000, min: 1324 },
      items: 4,
      slidesToSlide: 1,
    },
    large: {
      breakpoint: { max: 1324, min: 1005 },
      items: 3,
      slidesToSlide: 1,
    },
    medium: {
      breakpoint: { max: 1005, min: 700 },
      items: 2,
      slidesToSlide: 1,
    },
    small: {
      breakpoint: { max: 700, min: 0 },
      items: 1,
      slidesToSlide: 1,
    },
  };

  return (
    <>
      <div className="container departments">
        <h2>{t("departments_title")}</h2>
        <Carousel
          responsive={responsive}
          removeArrowOnDeviceType={["tablet", "mobile"]}
        >
          {departmentsArray.map((depart, index) => {
            return (
              <div key={index} className="card">
                <div className="depart-name">{depart.name}</div>
                <img src={depart.imageUrl} alt={depart.name} />
              </div>
            );
          })}
        </Carousel>
      </div>
    </>
  );
};

export default Departments;