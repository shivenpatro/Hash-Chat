import React, { useState, useContext } from "react";
import Image from "next/image";

// INTERNAL IMPORTS
import Style from "./Filter.module.css";
import images from "../../assets";
import { ChatAppContect } from "../../Context/ChatAppContext";
import { Model } from "../index";

const Filter = () => {
  const { addFriends, clearChat, setSearchQuery, searchQuery } = useContext(ChatAppContect);
  const [addFriend, setAddFriend] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);

  const handleClearChat = () => {
    if (clearConfirm) {
      // If already in confirmation state, clear the chat
      clearChat();
      setClearConfirm(false);
    } else {
      // First click - show confirmation
      setClearConfirm(true);
      // Reset confirmation state after 3 seconds
      setTimeout(() => setClearConfirm(false), 3000);
    }
  };

  return (
    <div className={Style.Filter}>
      <div className={Style.Filter_box}>
        <div className={Style.Filter_box_left}>
          <div className={Style.Filter_box_left_search}>
            <Image src={images.search} alt="Search" width={20} height={20} />
            <input
              type="text"
              placeholder="Search friends..."
              aria-label="Search friends"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className={Style.Filter_box_right}>
          <button 
            onClick={handleClearChat} 
            aria-label="Clear Chat"
            className={clearConfirm ? Style.clear_confirm : ""}
          >
            <Image src={images.clear} alt="Clear Chat" width={20} height={20} />
            {clearConfirm ? "CONFIRM CLEAR" : "CLEAR CHAT"}
          </button>
          <button onClick={() => setAddFriend(true)} aria-label="Add Friend">
            <Image src={images.user} alt="Add Friend" width={20} height={20} />
            ADD FRIEND
          </button>
        </div>
      </div>

      {addFriend && (
        <div className={Style.Filter_model}>
          <Model
            openBox={setAddFriend}
            title="WELCOME TO"
            head={<span><br/>Hash-Chat</span>}
            info="HashChat is a decentralized, Ethereum-based chat platform that ensures true privacy. With end-to-end encryption and no central servers, your messages stay secure and untouchable. No data collection, no surveillance—just pure, private communication. Join the future of secure messaging today!"
            smallInfo="Kindly Type Your Name..."
            image={images.hero}
            functionName={addFriends}
          />
        </div>
      )}
    </div>
  );
};

export default Filter;
