import React from 'react';
import styles from './Title.module.css';

const Title = ({ heading, paragraph }) => {
  return (
    <div className={styles.title}>
      <div className={styles.titleContainer}>
        <h1>{heading}</h1>
        {paragraph && <p>{paragraph}</p>}
      </div>
    </div>
  );
};

export default Title; 
