import React, { useState, useContext } from "react";
import Image from "next/image";
import Link from "next/link";

// INTERNAL IMPORTS
import Style from "./NavBar.module.css";
import { ChatAppContect } from "../../Context/ChatAppContext";
import { Model, Error } from "../index";
import images from "../../assets";

const NavBar = () => {
  const menuItems = [
    { menu: "ALL USERS", link: "alluser" },
    { menu: "CHAT", link: "/" },
    { menu: "ABOUT US", link: "/about" },
    { menu: "VIT-AP", link: "https://vitap.ac.in/", external: true },
  ];

  // STATE
  const [active, setActive] = useState(2);
  const [open, setOpen] = useState(false);
  const [openModel, setOpenModel] = useState(false);

  const { account, userName, connectWallet, createAccount, error } =
    useContext(ChatAppContect);

  return (
    <div className={Style.NavBar}>
      <div className={Style.NavBar_box}>
        <div className={Style.NavBar_box_left}>
          <Image src={images.logo} alt="logo" width={100} height={30.6184} />
        </div>
        <div className={Style.NavBar_box_right}>
          {/* DESKTOP MENU */}
          <div className={Style.NavBar_box_right_menu}>
            {menuItems.map((el, i) => (
              <div
                key={i}
                onClick={() => setActive(i + 1)}
                className={`${Style.NavBar_box_right_menu_items} ${
                  active === i + 1 && !el.external ? Style.active_btn : ""
                }`}
              >
                {el.external ? (
                  <a
                    href={el.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${Style.NavBar_box_right_menu_items_link} ${
                      active === i + 1 ? Style.active_btn : ""
                    }`}
                  >
                    {el.menu}
                  </a>
                ) : (
                  <Link
                    href={el.link}
                    className={`${Style.NavBar_box_right_menu_items_link} ${
                      active === i + 1 ? Style.active_btn : ""
                    }`}
                  >
                    {el.menu}
                  </Link>
                )}
              </div>
            ))}
          </div>

          {/* CONNECT WALLET */}
          <div className={Style.NavBar_box_right_connect}>
            {account === "" ? (
              <button onClick={connectWallet}>
                <span>Connect Wallet</span>
              </button>
            ) : (
              <button onClick={() => setOpenModel(true)}>
                <Image
                  src={userName ? images.accountName : images.create2}
                  alt="Account"
                  width={20}
                  height={20}
                />
                <small>{userName ? `@${userName}` : "Create Account"}</small>
              </button>
            )}
          </div>

          {/* MOBILE MENU TOGGLE */}
          <div
            className={Style.NavBar_box_right_open}
            onClick={() => setOpen(true)}
          >
            <Image src={images.open} alt="Open Menu" width={30} height={30} />
          </div>
        </div>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className={Style.mobile_menu}>
          {menuItems.map((el, i) => (
            <div
              key={i}
              onClick={() => setActive(i + 1)}
              className={`${Style.mobile_menu_items} ${
                active === i + 1 && !el.external ? Style.active_btn : ""
              }`}
            >
              {el.external ? (
                <a
                  href={el.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${Style.mobile_menu_items_link} ${
                    active === i + 1 ? Style.active_btn : ""
                  }`}
                >
                  {el.menu}
                </a>
              ) : (
                <Link 
                  href={el.link} 
                  className={`${Style.mobile_menu_items_link} ${
                    active === i + 1 ? Style.active_btn : ""
                  }`}
                >
                  {el.menu}
                </Link>
              )}
            </div>
          ))}
          <button
            className={Style.mobile_menu_btn}
            onClick={() => setOpen(false)}
            aria-label="Close Menu"
          >
            <Image src={images.close} alt="Close" width={50} height={50} />
          </button>
        </div>
      )}

      {/* MODEL COMPONENT */}
      {openModel && (
        <div className={Style.modelBox}>
          <Model
            openBox={setOpenModel}
            title="Welcome to"
            head={<span><br/>Hash-Chat</span>}
            info="Hash-Chat is a decentralized, Ethereum-based chat platform that ensures true privacy. With end-to-end encryption and no central servers, your messages stay secure and untouchable. No data collection, no surveillance—just pure, private communication. Join the future of secure messaging today!"
            smallInfo="Kindly Type Your Name..."
            image={images.hero}
            functionName={createAccount}
            address={account}
          />
        </div>
      )}
      {error && <Error error={error} />}
    </div>
  );
};

export default NavBar;
